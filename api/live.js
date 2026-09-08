/**
 * GET /api/live
 * Devuelve qué video de Giro 360 mostrar en la sección "En vivo":
 *   { mode: "live",   videoId, title }                 -> hay una transmisión EN VIVO de Giro 360
 *   { mode: "replay", videoId, title, publishedAt }    -> no hay vivo: última emisión de Giro 360
 *   { mode: "none" }                                   -> no se pudo determinar
 *
 * El canal de 0221 transmite varios programas, así que se filtra por título (Giro 360).
 * Función serverless de Vercel (Node). No necesita dependencias.
 */

var CHANNEL_ID = 'UCWFylKzypM2c1aRt5SImiuQ'; // youtube.com/c/0221comar
var MATCH = /giro\s*-?\s*360/i;
var FALLBACK_VIDEO_ID = ''; // opcional: ID de un programa completo de Giro 360 (último recurso)

var UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

async function getText(url) {
  var r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'es-AR,es;q=0.9' } });
  if (!r.ok) throw new Error(url + ' -> ' + r.status);
  return r.text();
}

function decodeXml(s) {
  return String(s)
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x27;/gi, "'");
}

// Extrae el objeto JSON asignado a `key = {...};` dentro del HTML de YouTube.
function extractJson(html, key) {
  var idx = html.indexOf(key);
  while (idx !== -1) {
    var brace = html.indexOf('{', idx);
    if (brace === -1) return null;
    var depth = 0, inStr = false, esc = false;
    for (var i = brace; i < html.length; i++) {
      var c = html[i];
      if (inStr) {
        if (esc) esc = false;
        else if (c === '\\') esc = true;
        else if (c === '"') inStr = false;
      } else if (c === '"') inStr = true;
      else if (c === '{') depth++;
      else if (c === '}') {
        depth--;
        if (depth === 0) {
          try { return JSON.parse(html.slice(brace, i + 1)); } catch (e) { break; }
        }
      }
    }
    idx = html.indexOf(key, idx + key.length);
  }
  return null;
}

async function checkLive() {
  var html = await getText('https://www.youtube.com/channel/' + CHANNEL_ID + '/live');
  var pr = extractJson(html, 'ytInitialPlayerResponse');
  if (!pr || !pr.videoDetails) return null;
  var vd = pr.videoDetails;
  var status = pr.playabilityStatus && pr.playabilityStatus.status;
  var isLive = vd.isLive === true ||
    (pr.playabilityStatus && pr.playabilityStatus.liveStreamability != null);
  if (isLive && status === 'OK' && MATCH.test(vd.title || '')) {
    return { mode: 'live', videoId: vd.videoId, title: vd.title };
  }
  return null;
}

async function latestFromRss() {
  var xml = await getText('https://www.youtube.com/feeds/videos.xml?channel_id=' + CHANNEL_ID);
  var entries = xml.split('<entry>').slice(1);
  for (var i = 0; i < entries.length; i++) {
    var e = entries[i];
    var t = (e.match(/<title>([^<]*)<\/title>/) || [])[1] || '';
    var id = (e.match(/<yt:videoId>([^<]*)<\/yt:videoId>/) || [])[1] || '';
    var pub = (e.match(/<published>([^<]*)<\/published>/) || [])[1] || '';
    t = decodeXml(t);
    if (id && MATCH.test(t)) {
      return { mode: 'replay', videoId: id, title: t, publishedAt: pub };
    }
  }
  return null;
}

async function latestFromPage() {
  var html = await getText('https://www.youtube.com/channel/' + CHANNEL_ID + '/streams');
  var data = extractJson(html, 'ytInitialData');
  if (!data) return null;
  var found = [];
  (function walk(o) {
    if (!o || typeof o !== 'object') return;
    var vr = o.videoRenderer;
    if (vr && vr.videoId) {
      var title = (vr.title && vr.title.runs && vr.title.runs.map(function (r) { return r.text; }).join('')) || '';
      found.push({ id: vr.videoId, title: title });
    }
    for (var k in o) walk(o[k]);
  })(data);
  for (var i = 0; i < found.length; i++) {
    if (MATCH.test(found[i].title)) {
      return { mode: 'replay', videoId: found[i].id, title: found[i].title };
    }
  }
  return null;
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=600');
  try {
    var out = null;
    try { out = await checkLive(); } catch (e) { /* sin vivo o fallo */ }
    if (!out) { try { out = await latestFromRss(); } catch (e) { /* rss falló */ } }
    if (!out) { try { out = await latestFromPage(); } catch (e) { /* scrape falló */ } }
    if (!out && FALLBACK_VIDEO_ID) out = { mode: 'replay', videoId: FALLBACK_VIDEO_ID };
    return res.status(200).json(out || { mode: 'none' });
  } catch (e) {
    return res.status(200).json({ mode: 'none', error: String((e && e.message) || e) });
  }
};
