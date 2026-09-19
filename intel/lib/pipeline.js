/* =========================================================================
   AGROVISION INTELLIGENCE — pipeline (Node)
   searchSources → fetchArticle → extractContent → classifyArticle →
   scoreArticle → verifyArticle → dedupe → detectTrends → generateContent
   Persistencia: intel/data/db.json (colecciones listadas en DB_COLLECTIONS;
   el equivalente SQL está en intel/schema.sql).
   ========================================================================= */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as core from './core.js';
import { fetchFeed } from './connectors/rss.js';
import { searchGoogleNews } from './connectors/googlenews.js';
import { fetchArticle } from './connectors/article.js';
import { readImportFile } from './connectors/manual.js';

export const INTEL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const P = (...p) => path.join(INTEL, ...p);
const readJSON = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const writeFile = (f, s) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, s); };

export const DB_COLLECTIONS = ['articles', 'sources', 'topics', 'trends', 'companies', 'startups', 'technologies', 'markets', 'countries', 'mexican_states', 'metrics', 'content_generated', 'saved_articles', 'newsletter_issues', 'social_posts', 'runs'];

export function loadConfig() {
  return { taxonomy: readJSON(P('config/taxonomy.json')), registry: readJSON(P('config/sources.json')), trendsCfg: readJSON(P('config/trends.json')) };
}
export function loadDB(file = P('data/db.json')) {
  const db = fs.existsSync(file) ? readJSON(file) : {};
  for (const c of DB_COLLECTIONS) if (!Array.isArray(db[c])) db[c] = [];
  db.meta = db.meta || { schema_version: 1, created_at: new Date().toISOString() };
  return db;
}
export function saveDB(db, file = P('data/db.json')) {
  db.meta.updated_at = new Date().toISOString();
  db.meta.counts = Object.fromEntries(DB_COLLECTIONS.map((c) => [c, db[c].length]));
  writeFile(file, JSON.stringify(db, null, 1));
}

/* ---------- 1. searchSources ---------- */
export async function searchSources({ query = null, feeds = null, log = console.log } = {}) {
  const { registry } = loadConfig();
  const list = feeds || (query
    ? [{ id: 'adhoc-es', type: 'googlenews', query, lang: 'es-419', country: 'MX' }, { id: 'adhoc-en', type: 'googlenews', query, lang: 'en-US', country: 'US' }]
    : registry.feeds);
  const results = []; const status = [];
  for (const f of list) {
    try {
      const items = f.type === 'googlenews' ? await searchGoogleNews(f) : await fetchFeed(f);
      results.push(...items.map((x) => ({ ...x, feed_id: f.id, ingested_via: f.type })));
      status.push({ id: f.id, ok: true, items: items.length });
      log(`  ✓ ${f.id}: ${items.length}`);
    } catch (e) {
      status.push({ id: f.id, ok: false, error: String(e.message || e) });
      log(`  ✗ ${f.id}: ${e.message || e}`);
    }
  }
  return { results, status };
}

/* ---------- 2. Ingesta de candidatos crudos (RSS / búsqueda) ---------- */
export async function ingestRaw(db, raws, { fetchPages = false, now = Date.now(), minRelevance = 30, log = console.log } = {}) {
  const ctx = { ...loadConfig(), now };
  let added = 0, skipped = 0;
  for (const r of raws) {
    let raw = { title_original: r.title, url: r.url, content: r.description, published_at: r.published_at, source_name: r.source_name, source_url: r.source_url, ingested_via: r.ingested_via || 'rss' };
    if (fetchPages) {
      try {
        const a = await fetchArticle(r.url);
        raw = { ...raw, url: a.url, content: [a.description, a.text].filter(Boolean).join('\n'), published_at: raw.published_at || a.published_at, source_name: raw.source_name || a.site_name, verified_by_fetch: true };
      } catch { /* se queda sin verificar */ }
    }
    const item = core.enrich(core.createItem(raw, ctx), ctx);
    if (db.articles.some((a) => a.id === item.id || a.canonical_url === item.canonical_url)) { skipped++; continue; }
    const pre = core.scoreArticle(item, ctx.taxonomy, { now });
    if (pre.base < minRelevance) { skipped++; continue; }
    db.articles.push(item); added++;
  }
  log(`  Ingesta: ${added} nuevos, ${skipped} descartados/duplicados`);
  return { added, skipped };
}

/* ---------- 3. Importación de investigación estructurada ---------- */
export function importItems(db, file, { now = Date.now(), via = 'manual', log = console.log } = {}) {
  const ctx = { ...loadConfig(), now, via };
  const { items, errors } = readImportFile(file);
  if (errors.length) throw new Error('Importación inválida:\n' + errors.join('\n'));
  let added = 0, updated = 0;
  for (const raw of items) {
    const item = core.enrich(core.createItem(raw, ctx), ctx);
    const i = db.articles.findIndex((a) => a.id === item.id);
    if (i >= 0) { db.articles[i] = { ...db.articles[i], ...item }; updated++; } else { db.articles.push(item); added++; }
  }
  log(`  Importado ${path.basename(file)}: ${added} nuevos, ${updated} actualizados`);
  return { added, updated };
}

/* ---------- 4. Recalcular: dedupe → verificar → puntuar → tendencias → colecciones ---------- */
export function recompute(db, { now = Date.now() } = {}) {
  const ctx = { ...loadConfig(), now };
  for (const a of db.articles) core.enrich(a, ctx);
  const { duplicates } = core.dedupe(db.articles);
  core.finalize(db.articles, ctx);
  const trends = core.detectTrends(db.articles, ctx.trendsCfg, { now });
  const stamp = new Date(now).toISOString();
  db.trends = trends.map((t) => ({ ...t, computed_at: stamp }));
  db.topics = ctx.trendsCfg.topics.map((t) => ({ id: t.id, label: t.label, terms: t.terms }));
  const live = db.articles.filter((a) => !a.duplicate_of);
  const bag = (fn) => { const m = new Map(); for (const a of live) for (const k of fn(a)) if (k) { const e = m.get(k) || { id: core.slugify(k), name: k, article_ids: [] }; e.article_ids.push(a.id); m.set(k, e); } return [...m.values()].sort((x, y) => y.article_ids.length - x.article_ids.length); };
  db.companies = bag((a) => a.companies || []);
  db.startups = db.companies.filter((c) => live.some((a) => c.article_ids.includes(a.id) && /startup/i.test([a.title_original, a.summary, a.content].join(' '))));
  db.technologies = bag((a) => a.technologies || []);
  db.markets = bag((a) => (a.category === 'BUSINESS' ? [a.subcategory] : []));
  db.countries = bag((a) => [a.country]);
  db.mexican_states = bag((a) => [a.mx_state]);
  db.metrics = live.flatMap((a) => (a.metrics || []).map((m) => ({ ...m, article_id: a.id, source: m.source || a.source_name, url: m.url || a.url })));
  const seen = new Map(db.sources.map((s) => [s.domain, s]));
  for (const a of db.articles) {
    const s = seen.get(a.source_domain) || { domain: a.source_domain, name: a.source_name, tier: a.source_tier, type: a.source_type, kind: a.source_kind, article_count: 0 };
    s.article_count = db.articles.filter((x) => x.source_domain === a.source_domain).length;
    seen.set(a.source_domain, s);
  }
  db.sources = [...seen.values()];
  return { duplicates, trends: trends.length };
}

/* ---------- 5. Generar contenido a archivos ---------- */
const FILES = { newsletter: 'newsletter.md', instagram: 'instagram.md', linkedin: 'linkedin.md', article: 'article.md', reel: 'reel.md', stories: 'stories.md' };
export function generateToFiles(db, id, types = ['newsletter', 'instagram', 'linkedin', 'article', 'reel'], { outDir = P('output'), date = new Date().toISOString().slice(0, 10) } = {}) {
  const item = db.articles.find((a) => a.id === id);
  if (!item) throw new Error('No existe el ítem ' + id);
  const slug = core.slugify(item.title_agrovision || item.title_original, 50);
  const dir = path.join(outDir, date, slug);
  const written = [];
  for (const t of types) {
    const md = core.generateContent(item, t);
    const f = path.join(dir, FILES[t]);
    writeFile(f, md + '\n');
    written.push(path.relative(INTEL, f));
    const rec = { id: `${id}-${t}-${date}`, article_id: id, type: t, path: path.relative(INTEL, f), created_at: new Date().toISOString(), publishable: item.publishable, status: item.publishable ? 'borrador-listo-para-revision' : 'NO VERIFICADO' };
    db.content_generated = db.content_generated.filter((c) => c.id !== rec.id).concat(rec);
    if (['instagram', 'reel', 'linkedin', 'stories'].includes(t)) db.social_posts = db.social_posts.filter((c) => c.id !== rec.id).concat({ ...rec, channel: t === 'linkedin' ? 'LinkedIn' : 'Instagram', approved: false });
  }
  return written;
}

/* ---------- 6. Informes ---------- */
export function dailySummary(db, { now = Date.now() } = {}) {
  const day = new Date(now).toISOString().slice(0, 10);
  const live = db.articles.filter((a) => !a.duplicate_of);
  const recent = live.filter((a) => a.retrieved_at && (now - new Date(a.retrieved_at)) <= 86400000);
  const top = live.filter((a) => a.publishable).sort((a, b) => b.priority - a.priority).slice(0, 5);
  const review = live.filter((a) => !a.publishable && a.score >= core.PUBLISH_THRESHOLD).slice(0, 10);
  return [
    `# Resumen diario AGROVISION INTELLIGENCE — ${day}`, ``,
    `- Ítems en base: ${db.articles.length} (${live.length} únicos) · nuevos en 24 h: ${recent.length}`,
    `- Publicables: ${live.filter((a) => a.publishable).length} · Pendientes de análisis/verificación: ${live.filter((a) => !a.publishable).length}`, ``,
    `## Top 5 con mayor potencial editorial`, ...top.map((a, i) => `${i + 1}. ${a.title_agrovision || a.title_original} — ${a.source_name} (${a.published_at || 's/f'}) · ${a.evidence}`), ``,
    `## Tendencias`, ...db.trends.slice(0, 5).map((t) => `- ${t.label}: ${t.mentions} menciones · ${t.direction}`), ``,
    `## Relevantes que requieren análisis o segunda fuente`, ...(review.length ? review.map((a) => `- ${a.title_original} — ${a.source_name} · ${a.url}`) : ['- Ninguno']), ``
  ].join('\n');
}
export function writeWeekly(db, { now = Date.now(), upcoming } = {}) {
  const issue = db.newsletter_issues.length + 1;
  const md = core.buildWeekly(db.articles, db.trends, { issue, now, upcoming });
  const date = new Date(now).toISOString().slice(0, 10);
  const f = P('output', date, `agrovision-weekly-${String(issue).padStart(3, '0')}.md`);
  writeFile(f, md + '\n');
  db.newsletter_issues.push({ id: `weekly-${String(issue).padStart(3, '0')}`, issue, date, path: path.relative(INTEL, f), status: 'borrador' });
  return { issue, file: f, md };
}
export function exportItems(items, format) {
  if (format === 'json') return JSON.stringify(items, null, 2);
  if (format === 'csv') return core.toCSV(items);
  if (format === 'md') return core.toMarkdown(items);
  throw new Error('Formato no soportado: ' + format);
}
