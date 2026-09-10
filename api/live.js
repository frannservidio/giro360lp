/**
 * GET /api/live  —  qué video de Giro 360 mostrar en la sección "En vivo".
 *
 *   { mode: "live",     videoId, title }
 *   { mode: "upcoming", videoId, title, airedOn }   -> el estreno programado para hoy
 *   { mode: "replay",   videoId, title, airedOn }
 *   { mode: "none" }
 *
 * REGLA (hora de Buenos Aires, UTC-3). El programa sale MARTES y JUEVES.
 * Se muestra la emisión del día de transmisión más reciente que sea <= hoy:
 *   martes / jueves       -> la de hoy (o el vivo / estreno de hoy)
 *   miércoles             -> la del martes
 *   viernes / finde / lun -> la del jueves
 *
 * SCHEDULE: para GARANTIZAR qué video va cada día (sobre todo el de HOY, que la
 * detección automática no puede adivinar hasta que 0221 lo sube), pegá acá el ID
 * de YouTube con la fecha de emisión (YYYY-MM-DD). Lo que esté acá gana; si no hay
 * entrada para el día, la función busca sola en el RSS del canal y "acomoda" la
 * fecha de publicación al martes/jueves anterior.
 */

var SCHEDULE = {
  '2026-09-04': 'q1V-Ma7f6qI',   // jueves  — ¿POR QUÉ los JÓVENES volvieron a TOMAR VINO?
  '2026-09-08': 'QQpQDidn-9g'    // martes  — GIRO 360 con SOFI, THIAGO y FRAN
  // '2026-09-11': 'XXXXXXXXXXX'  <- agregá acá el video de la próxima emisión
};

var CHANNEL_ID = 'UCWFylKzypM2c1aRt5SImiuQ'; // youtube.com/c/0221comar
var MATCH = /giro\s*-?\s*360/i;
var FALLBACK_VIDEO_ID = 'q1V-Ma7f6qI';
var UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

/* ---------- fechas (Buenos Aires, UTC-3) ---------- */
function baFrom(d) { return new Date(d.getTime() + d.getTimezoneOffset() * 60000 - 3 * 3600000); }
function baNow() { return baFrom(new Date()); }
function ymd(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function isBroadcastDay(d) { return d.getDay() === 2 || d.getDay() === 4; }
// martes(2) o jueves(4) más reciente <= fecha dada
function prevBroadcast(dateObj) {
  var d = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
  for (var i = 0; i < 7; i++) { if (isBroadcastDay(d)) return ymd(d); d.setDate(d.getDate() - 1); }
  return ymd(d);
}
function snapPrevBroadcast(s) {
  var p = s.split('-'); if (p.length !== 3) return s;
  return prevBroadcast(new Date(+p[0], +p[1] - 1, +p[2]));
}

/* ---------- YouTube ---------- */
async function getText(url) {
  var r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'es-AR,es;q=0.9' } });
  if (!r.ok) throw new Error(url + ' -> ' + r.status);
  return r.text();
}
function decodeXml(s) {
  return String(s).replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x27;/gi, "'");
}
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

// Episodios de Giro 360 desde el RSS del canal: { videoId, title, airedOn }
// airedOn = fecha de publicación "acomodada" al martes/jueves de emisión anterior
// (0221 sube la grabación al día siguiente, así que un video subido un miércoles
//  se cuenta como la emisión del martes).
async function getEpisodes() {
  var out = [];
  try {
    var xml = await getText('https://www.youtube.com/feeds/videos.xml?channel_id=' + CHANNEL_ID);
    xml.split('<entry>').slice(1).forEach(function (e) {
      var t = decodeXml((e.match(/<title>([^<]*)<\/title>/) || [])[1] || '');
      var id = (e.match(/<yt:videoId>([^<]*)<\/yt:videoId>/) || [])[1] || '';
      var pub = (e.match(/<published>([^<]*)<\/published>/) || [])[1] || '';
      if (!id || !MATCH.test(t)) return;
      var pubBA = pub ? ymd(baFrom(new Date(pub))) : null;
      out.push({ videoId: id, title: t, airedOn: pubBA ? snapPrevBroadcast(pubBA) : null });
    });
  } catch (e) {}
  return out;
}

async function checkLive() {
  var html = await getText('https://www.youtube.com/channel/' + CHANNEL_ID + '/live');
  var pr = extractJson(html, 'ytInitialPlayerResponse');
  if (!pr || !pr.videoDetails) return null;
  var vd = pr.videoDetails;
  var ok = pr.playabilityStatus && pr.playabilityStatus.status === 'OK';
  if (vd.isLive === true && ok && MATCH.test(vd.title || '')) {
    return { mode: 'live', videoId: vd.videoId, title: vd.title };
  }
  return null;
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=600');
  try {
    var now = baNow();
    var today = ymd(now);
    var target = prevBroadcast(now);
    var bDay = isBroadcastDay(now);

    // 1) override manual
    if (SCHEDULE[target]) {
      return res.status(200).json({
        mode: SCHEDULE[target] && target === today && bDay ? 'upcoming' : 'replay',
        videoId: SCHEDULE[target], airedOn: target
      });
    }

    // 2) día de transmisión: ¿vivo ahora?
    if (bDay) {
      try { var live = await checkLive(); if (live) return res.status(200).json(live); } catch (e) {}
    }

    var eps = [];
    try { eps = await getEpisodes(); } catch (e) {}

    // 3) emisión del día objetivo: la de fecha más alta que no pase de `target`
    var pool = eps.filter(function (v) { return v.airedOn && v.airedOn <= target; });
    pool.sort(function (a, b) { return a.airedOn < b.airedOn ? 1 : -1; });
    var best = pool[0] || eps[0];
    if (best && best.videoId) {
      return res.status(200).json({ mode: 'replay', videoId: best.videoId, title: best.title || null, airedOn: best.airedOn || null });
    }

    if (FALLBACK_VIDEO_ID) return res.status(200).json({ mode: 'replay', videoId: FALLBACK_VIDEO_ID, airedOn: null });
    return res.status(200).json({ mode: 'none' });
  } catch (e) {
    return res.status(200).json({ mode: 'none', error: String((e && e.message) || e) });
  }
};
