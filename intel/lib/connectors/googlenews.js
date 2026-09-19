/* Conector Google News (RSS público de búsqueda). No requiere API key.
   Nota: los enlaces de Google News redirigen al medio; el pipeline guarda
   el nombre del medio (<source>) y, si fetchArticle puede seguir la
   redirección, la URL final del medio. */
import { fetchFeed } from './rss.js';

export function googleNewsUrl({ query, lang = 'es-419', country = 'MX', days = 7 }) {
  const q = encodeURIComponent(`${query} when:${days}d`);
  const [hl] = [lang];
  const ceidLang = lang.split('-')[0] === 'es' ? 'es-419' : lang.split('-')[0];
  return `https://news.google.com/rss/search?q=${q}&hl=${hl}&gl=${country}&ceid=${country}:${ceidLang}`;
}

export async function searchGoogleNews(feed) {
  return fetchFeed({ ...feed, url: googleNewsUrl(feed), type: 'googlenews' });
}
