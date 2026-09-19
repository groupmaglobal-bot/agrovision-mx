/* Conector RSS 2.0 / Atom sin dependencias (Node 20+: fetch global).
   parseFeed() es puro y se prueba con fixtures; fetchFeed() hace la red. */

const decode = (s) => String(s || '')
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&amp;/g, '&');
export const stripTags = (s) => decode(s).replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const tag = (xml, name) => { const m = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, 'i')); return m ? m[1] : ''; };
const attr = (xml, name, a) => { const m = xml.match(new RegExp(`<${name}\\b[^>]*\\b${a}="([^"]*)"`, 'i')); return m ? decode(m[1]) : ''; };

export function toISODate(s) {
  if (!s) return null;
  const d = new Date(decode(s).trim());
  return isNaN(d) ? null : d.toISOString().slice(0, 10);
}

export function parseFeed(xml, feedMeta = {}) {
  const isAtom = /<feed[\s>]/i.test(xml) && !/<rss[\s>]/i.test(xml);
  const blocks = xml.match(isAtom ? /<entry[\s>][\s\S]*?<\/entry>/gi : /<item[\s>][\s\S]*?<\/item>/gi) || [];
  return blocks.map((b) => {
    const link = isAtom ? (attr(b, 'link', 'href') || stripTags(tag(b, 'id'))) : stripTags(tag(b, 'link')) || stripTags(tag(b, 'guid'));
    let title = stripTags(tag(b, 'title'));
    let source = stripTags(tag(b, 'source'));
    const sourceUrl = attr(b, 'source', 'url');
    // Google News: "Título - Medio"
    if (feedMeta.type === 'googlenews' && source && title.endsWith(' - ' + source)) title = title.slice(0, -(source.length + 3));
    return {
      title,
      url: link,
      description: stripTags(tag(b, isAtom ? 'summary' : 'description') || tag(b, 'content:encoded') || tag(b, 'content')).slice(0, 2000),
      published_at: toISODate(tag(b, isAtom ? 'updated' : 'pubDate') || tag(b, 'published') || tag(b, 'dc:date')),
      source_name: source || null,
      source_url: sourceUrl || null,
      feed_id: feedMeta.id || null
    };
  }).filter((x) => x.title && x.url);
}

export async function fetchText(url, { timeoutMs = 20000 } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal, redirect: 'follow', headers: { 'User-Agent': 'AgrovisionIntelligence/1.0 (+https://groupmaglobal-bot.github.io/agrovision-mx/)', Accept: 'application/rss+xml, application/xml, text/xml, text/html;q=0.9, */*;q=0.5' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return { text: await res.text(), finalUrl: res.url };
  } finally { clearTimeout(t); }
}

export async function fetchFeed(feed) {
  const { text } = await fetchText(feed.url);
  return parseFeed(text, feed);
}
