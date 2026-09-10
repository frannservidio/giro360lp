/**
 * GET /api/live
 * Qué video de Giro 360 mostrar en la sección "En vivo".
 *
 *   { mode: "live",   videoId, title }                  -> transmisión EN VIVO ahora
 *   { mode: "replay", videoId, title, airedOn }         -> emisión de un día concreto (YYYY-MM-DD)
 *   { mode: "none" }                                    -> no se pudo determinar
 *
 * Regla de fechas (hora de Buenos Aires, UTC-3):
 *   El programa sale los MARTES y JUEVES. Se muestra la emisión del día de
 *   transmisión más reciente que sea <= hoy:
 *     - martes/jueves  -> la de hoy (o el vivo, si está al aire)
 *     - miércoles      -> la del martes
 *     - viernes/finde/lunes -> la del jueves
 *
 * Para no confundirse cuando 0221 retoca o re-sube un video después de la emisión,
 * la fecha de cada video se toma PRIMERO del título (formato dd/mm/aa) y, si no
 * hay, de la fecha de publicación.
 *
 * Función serverless de Vercel (Node). Sin dependencias.
 */

var CHANNEL_ID = 'UCWFylKzypM2c1aRt5SImiuQ'; // youtube.com/c/0221comar
var MATCH = /giro\s*-?\s*360/i;
var FALLBACK_VIDEO_ID = 'q1V-Ma7f6qI'; // último recurso: un programa completo de Giro 360
var UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

/* ---------- utilidades de fecha (Buenos Aires, UTC-3) ---------- */
function baNow() {
  var d = new Date();
  return new Date(d.getTime() + d.getTimezoneOffset() * 60000 - 3 * 3600000);
}
function ymd(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
// Día de transmisión más reciente <= hoy (martes=2, jueves=4)
function targetBroadcastDate(now) {
  var d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  for (var i = 0; i < 7; i++) {
    if (d.getDay() === 2 || d.getDay() === 4) return ymd(d);
    d.setDate(d.getDate() - 1);
  }
  return ymd(d);
}
// dd/mm/aa | dd-mm-aaaa | dd.mm.aa  ->  YYYY-MM-DD  (toma la última coincidencia del título)
function dateFromTitle(title) {
  var re = /(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})/g, m, last = null;
  while ((m = re.exec(title)) !== null) last = m;
  if (!last) return null;
  var dd = +last[1], mm = +last[2], yy = +last[3];
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
  if (yy < 100) yy += 2000;
  return yy + '-' + String(mm).padStart(2, '0') + '-' + String(dd).padStart(2, '0');
}

/* ---------- fetch / parseo de YouTube ---------- */
async function getText(url) {
  var r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'es-AR,es;q=0.9' } });
  if (!r.ok) throw new Error(url + ' -> ' + r.status);
  return r.text();
}
function decodeXml(s) {
  return String(s).replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x27;/gi, "'");
}
// Objeto JSON asignado a `key = {...}` dentro del HTML de YouTube
function extractJson(html, key) {
  var idx = html.indexOf(key);
  while (idx !== -1) {
    var brace = html.indexOf('{', idx);
    if (brace === -1) return null;
    var depth = 0, inStr = false, esc = false;
    for (var i = brace; i < html.length; i++) {
      var c = html[i];
      if (inStr) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') inStr = false; }
      else if (c === '"') inStr = true;
      else if (c === '{') depth++;
      else if (c === '}') { depth--; if (depth === 0) { try { return JSON.parse(html.slice(brace, i + 1)); } catch (e) { break; } } }
    }
    idx = html.indexOf(key, idx + key.length);
  }
  return null;
}

// Lista de episodios de Giro 360: [{ videoId, title, airedOn }]  (airedOn = YYYY-MM-DD)
async function getEpisodes() {
  var list = [];
  // 1) RSS
  try {
    var xml = await getText('https://www.youtube.com/feeds/videos.xml?channel_id=' + CHANNEL_ID);
    xml.split('<entry>').slice(1).forEach(function (e) {
      var t = decodeXml((e.match(/<title>([^<]*)<\/title>/) || [])[1] || '');
      var id = (e.match(/<yt:videoId>([^<]*)<\/yt:videoId>/) || [])[1] || '';
      var pub = (e.match(/<published>([^<]*)<\/published>/) || [])[1] || '';
      if (id && MATCH.test(t)) {
        var baPub = pub ? ymd(new Date(new Date(pub).getTime() - 3 * 3600000)) : null;
        list.push({ videoId: id, title: t, airedOn: dateFromTitle(t) || baPub });
      }
    });
  } catch (e) { /* sigue con el scrape */ }

  // 2) scrape de /streams si el RSS no dio nada
  if (!list.length) {
    try {
      var html = await getText('https://www.youtube.com/channel/' + CHANNEL_ID + '/streams');
      var data = extractJson(html, 'ytInitialData');
      if (data) (function walk(o) {
        if (!o || typeof o !== 'object') return;
        var vr = o.videoRenderer;
        if (vr && vr.videoId) {
          var title = (vr.title && vr.title.runs && vr.title.runs.map(function (r) { return r.text; }).join('')) || '';
          if (MATCH.test(title)) list.push({ videoId: vr.videoId, title: title, airedOn: dateFromTitle(title) });
        }
        for (var k in o) walk(o[k]);
      })(data);
    } catch (e) { /* nada */ }
  }
  return list;
}

async function checkLive() {
  var html = await getText('https://www.youtube.com/channel/' + CHANNEL_ID + '/live');
  var pr = extractJson(html, 'ytInitialPlayerResponse');
  if (!pr || !pr.videoDetails) return null;
  var vd = pr.videoDetails;
  var status = pr.playabilityStatus && pr.playabilityStatus.status;
  if (vd.isLive === true && status === 'OK' && MATCH.test(vd.title || '')) {
    return { mode: 'live', videoId: vd.videoId, title: vd.title };
  }
  return null;
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=600');
  try {
    var now = baNow();
    var target = targetBroadcastDate(now);
    var isBroadcastDay = now.getDay() === 2 || now.getDay() === 4;

    if (isBroadcastDay) {
      try { var live = await checkLive(); if (live) return res.status(200).json(live); } catch (e) {}
    }

    var eps = [];
    try { eps = await getEpisodes(); } catch (e) {}
    // el de fecha más alta que no pase del día de transmisión objetivo
    var best = eps
      .filter(function (v) { return v.airedOn && v.airedOn <= target; })
      .sort(function (a, b) { return a.airedOn < b.airedOn ? 1 : -1; })[0];

    // si no hubo match con fecha, usar el más nuevo de la lista igual
    if (!best && eps.length) best = eps[0];

    if (best) {
      return res.status(200).json({ mode: 'replay', videoId: best.videoId, title: best.title, airedOn: best.airedOn || null });
    }
    if (FALLBACK_VIDEO_ID) {
      return res.status(200).json({ mode: 'replay', videoId: FALLBACK_VIDEO_ID, airedOn: null });
    }
    return res.status(200).json({ mode: 'none' });
  } catch (e) {
    return res.status(200).json({ mode: 'none', error: String((e && e.message) || e) });
  }
};
