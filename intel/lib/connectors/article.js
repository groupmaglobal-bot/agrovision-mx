/* fetchArticle() + extractContent(): descarga una página y extrae
   título, descripción, fecha, medio y texto principal (heurística ligera,
   sin dependencias). extractContent() es pura y se prueba con fixtures. */
import { fetchText, stripTags, toISODate } from './rss.js';

const meta = (html, key) => {
  const re = new RegExp(`<meta[^>]+(?:property|name|itemprop)=["']${key}["'][^>]*>`, 'i');
  const m = html.match(re);
  if (!m) return '';
  const c = m[0].match(/content=["']([^"']*)["']/i);
  return c ? stripTags(c[1]) : '';
};

export function extractContent(html, url = '') {
  const title = meta(html, 'og:title') || stripTags((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '');
  const description = meta(html, 'og:description') || meta(html, 'description');
  let published = meta(html, 'article:published_time') || meta(html, 'datePublished') || meta(html, 'date') || meta(html, 'DC.date.issued');
  if (!published) { const ld = html.match(/"datePublished"\s*:\s*"([^"]+)"/); if (ld) published = ld[1]; }
  if (!published) { const t = html.match(/<time[^>]+datetime=["']([^"']+)["']/i); if (t) published = t[1]; }
  const site = meta(html, 'og:site_name');
  const body = (html.match(/<article[\s\S]*?<\/article>/i) || [html])[0];
  const paragraphs = (body.match(/<p[\s>][\s\S]*?<\/p>/gi) || []).map(stripTags).filter((p) => p.length > 60);
  const text = paragraphs.join('\n').slice(0, 12000);
  return { title, description, published_at: toISODate(published), site_name: site || null, text, url };
}

export async function fetchArticle(url) {
  const { text, finalUrl } = await fetchText(url);
  return { ...extractContent(text, finalUrl), url: finalUrl, fetched: true };
}
