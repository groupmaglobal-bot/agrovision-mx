// Pruebas unitarias del motor (sin red). Ejecuta: npm run intel:test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as core from '../lib/core.js';
import { parseFeed } from '../lib/connectors/rss.js';
import { extractContent } from '../lib/connectors/article.js';
import { googleNewsUrl } from '../lib/connectors/googlenews.js';

const J = (p) => JSON.parse(fs.readFileSync(new URL(p, import.meta.url), 'utf8'));
const taxonomy = J('../config/taxonomy.json');
const registry = J('../config/sources.json');
const trendsCfg = J('../config/trends.json');
const NOW = Date.parse('2026-09-19T15:00:00Z');
const ctx = { taxonomy, registry, trendsCfg, now: NOW };

const base = {
  title_original: 'CIMMYT usa inteligencia artificial para anticipar plagas en maíz de México',
  title_agrovision: 'Cómo la IA está entrando al campo mexicano',
  url: 'https://www.cimmyt.org/news/ia-maiz/?utm_source=x',
  published_at: '2026-09-10',
  summary: 'El CIMMYT desarrolla un modelo de inteligencia artificial con SADER para anticipar plagas en maíz. Productores de Guanajuato participan en el piloto.',
  what_changed: 'Se lanza un piloto en campo.',
  key_fact: 'El piloto cubre 1,200 hectáreas con 35 productores (2026).',
  why_matters: 'Anticipar plagas reduce pérdidas para productores.',
  impact_producers: 'Alertas tempranas para decidir cuándo aplicar.',
  impact_business: 'Mercado para servicios de monitoreo.',
  impact_mexico: 'Aplicable a zonas maiceras del Bajío.',
  business_opportunity: 'Servicios de alerta por suscripción para asociaciones de productores.',
  metrics: [{ metric: 'Superficie del piloto', value: 1200, unit: 'hectáreas', period: '2026', region: 'Guanajuato', source: 'CIMMYT', url: 'https://www.cimmyt.org/news/ia-maiz/' }],
  verified_by_fetch: true
};
const mk = (over = {}) => core.enrich(core.createItem({ ...base, ...over }, ctx), ctx);

test('normalize y hasTerm respetan límites de palabra y acentos', () => {
  assert.equal(core.normalize('  Agricultura   de PRECISIÓN '), 'agricultura de precision');
  assert.ok(core.hasTerm('uso de ia en el campo', 'ia'));
  assert.ok(!core.hasTerm('chihuahua y media', 'ia'), '"ia" no debe coincidir dentro de otras palabras');
});

test('canonicalUrl elimina utm y www', () => {
  assert.equal(core.canonicalUrl('https://www.cimmyt.org/news/ia-maiz/?utm_source=x#top'), 'https://cimmyt.org/news/ia-maiz');
});

test('sourceInfo usa el registro y dominios padre', () => {
  assert.equal(core.sourceInfo('https://www.gob.mx/agricultura/prensa/x', registry).tier, 1);
  assert.equal(core.sourceInfo('https://news.microsoft.com/x', registry).name, 'Microsoft');
  assert.equal(core.sourceInfo('https://blog-desconocido.net/x', registry).tier, 0);
});

test('classifyArticle detecta categoría, tecnología y estado', () => {
  const it = mk();
  assert.equal(it.category, 'TECH');
  assert.ok(it.technologies.includes('Inteligencia Artificial'));
  assert.equal(it.mx_state, 'Guanajuato');
  assert.equal(it.country, 'México');
});

test('classifyArticle es idempotente (re-clasificar no cambia el resultado)', () => {
  const it = mk();
  const first = JSON.stringify([it.category, it.mx_state, it.technologies]);
  core.enrich(it, ctx); core.enrich(it, ctx);
  assert.equal(JSON.stringify([it.category, it.mx_state, it.technologies]), first);
});

test('scoreArticle aplica pesos, bonificadores y penalizaciones', () => {
  const good = core.scoreArticle(mk(), taxonomy, { now: NOW });
  assert.ok(good.score >= 70, 'ítem sólido debe puntuar alto: ' + good.score);
  assert.equal(good.bonuses.datos_nuevos, 10);
  assert.equal(good.bonuses.agro_mas_tech, 10);
  const bait = core.scoreArticle(mk({ title_agrovision: 'Esta tecnología lo cambia todo', url: 'https://x.example/a' }), taxonomy, { now: NOW });
  assert.equal(bait.penalties.clickbait, -50);
  const noEv = core.scoreArticle(mk({ verified_by_fetch: false, url: 'https://x.example/b' }), taxonomy, { now: NOW });
  assert.equal(noEv.penalties.sin_evidencia, -40);
  const fake = core.scoreArticle(mk({ flags: { false_info: true } }), taxonomy, { now: NOW });
  assert.equal(fake.penalties.informacion_falsa, -100);
  assert.equal(fake.score, 0);
});

test('verifyArticle: primaria verificada = ALTO; blog sin corroborar = BAJO', () => {
  assert.equal(core.verifyArticle(mk(), [], registry).evidence, 'ALTO');
  const weak = mk({ url: 'https://www.eavision.com/blog/x', verified_by_fetch: true });
  const v = core.verifyArticle(weak, [], registry);
  assert.equal(v.evidence, 'BAJO');
  assert.equal(v.status, 'NO VERIFICADO');
});

test('verifyArticle nunca sube la evidencia por encima de la del analista', () => {
  const it = mk({ evidence: 'MEDIO' });
  assert.equal(core.verifyArticle(it, [], registry).evidence, 'MEDIO');
});

test('verifyArticle expone contradicciones', () => {
  const v = core.verifyArticle(mk({ contradictions: 'Fuente A dice 14 meses; fuente B dice 21.' }), [], registry);
  assert.ok(v.warnings.some((w) => w.startsWith('Las fuentes consultadas difieren')));
});

test('dedupe: misma URL o misma historia con cifras iguales = duplicado', () => {
  const a = mk();
  const b = mk({ url: 'https://cimmyt.org/news/ia-maiz' }); // misma URL canónica
  const c = mk({ url: 'https://www.jornada.com.mx/nota', title_original: 'IA del CIMMYT anticipa plagas del maíz en México', key_fact: 'Piloto de 1,200 hectáreas y 35 productores.' });
  b.id = 'b'; c.id = 'c';
  const { duplicates } = core.dedupe([a, b, c]);
  assert.equal(duplicates, 2);
  assert.equal(a.duplicate_of, null);
  assert.ok(a.corroborating_sources.some((s) => s.url.includes('jornada')));
});

test('finalize: sólo es publicable con análisis completo y evidencia suficiente', () => {
  const ok = mk();
  const incomplete = mk({ url: 'https://www.fao.org/x', why_matters: '' });
  core.finalize([ok, incomplete], ctx);
  assert.equal(ok.publishable, true);
  assert.equal(incomplete.publishable, false);
});

test('generateContent no inventa: marca [PENDIENTE] y NO VERIFICADO cuando falta información', () => {
  const it = mk({ url: 'https://blog-desconocido.net/x', impact_mexico: '', verified_by_fetch: false });
  core.finalize([it], ctx);
  const md = core.generateContent(it, 'instagram');
  assert.match(md, /NO VERIFICADO/);
  assert.match(md, /\[PENDIENTE: impacto en México\]/);
});

test('generateContent: todos los formatos citan la fuente y no introducen cifras ajenas al ítem', () => {
  const it = mk(); core.finalize([it], ctx);
  const numsIn = (txt) => (txt.match(/\d[\d,.]*\d|\d/g) || []).map((n) => n.replace(/,/g, ''));
  // Permitidas: cualquier cifra presente en el ítem (con fuente) + constantes de plantilla (slides 1-9, tiempos del reel)
  const allowed = new Set([...numsIn(JSON.stringify(it)), '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '20', '35', '45', '001']);
  for (const t of core.CONTENT_TYPES) {
    const md = core.generateContent(it, t);
    assert.ok(md.includes('CIMMYT'), `${t} debe citar la fuente`);
    const body = md.replace(/```json[\s\S]*```/, '').replace(/https?:\/\/\S+/g, '');
    for (const n of numsIn(body)) assert.ok(allowed.has(n), `${t}: cifra no rastreable "${n}"`);
  }
});

test('buildSEO produce title ≤ 60, description ≤ 155 y Schema.org Article', () => {
  const seo = core.buildSEO(mk());
  assert.ok(seo.title.length <= 60);
  assert.ok(seo.description.length <= 155);
  assert.equal(seo.schema['@type'], 'Article');
  assert.ok(seo.schema.citation.length >= 1);
  assert.ok(seo.og['og:title'] && seo.twitter['twitter:card']);
});

test('detectTrends cuenta menciones y diversidad de fuentes', () => {
  const items = [mk(), mk({ url: 'https://www.fao.org/y', title_original: 'FAO: drones e inteligencia artificial en agricultura' })];
  items[1].id = 'y';
  core.finalize(items, ctx);
  const t = core.detectTrends(items, trendsCfg, { now: NOW });
  const ia = t.find((x) => x.id === 'ia-agricola');
  assert.equal(ia.mentions, 2);
  assert.ok(ia.score > 0);
});

test('buildWeekly incluye las 9 secciones y fuentes', () => {
  const it = mk(); core.finalize([it], ctx);
  const md = core.buildWeekly([it], [], { issue: 1, now: NOW });
  for (const s of ['01 — LO MÁS IMPORTANTE', '02 — AGROTECH', '03 — NEGOCIOS', '04 — MÉXICO', '05 — EL DATO', '06 — STARTUP', '07 — TECNOLOGÍA', '08 — OPORTUNIDAD', '09 — LO QUE VIENE']) assert.ok(md.includes(s), s);
  assert.match(md, /AGROVISION WEEKLY #001/);
  assert.match(md, /cimmyt\.org/);
});

test('toCSV escapa comas y comillas', () => {
  const csv = core.toCSV([{ id: '1', title_original: 'Hola, "mundo"' }], ['id', 'title_original']);
  assert.match(csv, /"Hola, ""mundo"""/);
});

test('parseFeed: RSS 2.0, Atom y Google News', () => {
  const rss = parseFeed(fs.readFileSync(new URL('./fixtures/rss.xml', import.meta.url), 'utf8'));
  assert.equal(rss.length, 2);
  assert.equal(rss[0].title, 'Drones & sensores en Sinaloa');
  assert.equal(rss[0].published_at, '2026-09-15');
  const atom = parseFeed(fs.readFileSync(new URL('./fixtures/atom.xml', import.meta.url), 'utf8'));
  assert.equal(atom[0].url, 'https://example.org/atom-1');
  const gn = parseFeed(fs.readFileSync(new URL('./fixtures/googlenews.xml', import.meta.url), 'utf8'), { type: 'googlenews' });
  assert.equal(gn[0].title, 'SADER anuncia programa de riego');
  assert.equal(gn[0].source_name, 'El Economista');
  assert.equal(gn[0].source_url, 'https://www.eleconomista.com.mx');
});

test('extractContent obtiene metadatos y texto', () => {
  const a = extractContent(fs.readFileSync(new URL('./fixtures/article.html', import.meta.url), 'utf8'), 'https://example.org/n');
  assert.equal(a.title, 'Riego tecnificado crece en Guanajuato');
  assert.equal(a.published_at, '2026-09-12');
  assert.match(a.text, /goteo/);
});

test('googleNewsUrl arma la consulta con idioma y país', () => {
  const u = googleNewsUrl({ query: 'drones agrícolas', lang: 'es-419', country: 'MX', days: 7 });
  assert.match(u, /^https:\/\/news\.google\.com\/rss\/search\?q=drones%20agr%C3%ADcolas%20when%3A7d&hl=es-419&gl=MX&ceid=MX:es-419$/);
});

test('db.json del repositorio: todo ítem publicable tiene fuente https, fecha y evidencia ≠ BAJO', { skip: !fs.existsSync(new URL('../data/db.json', import.meta.url)) && 'db.json aún no generado' }, () => {
  const db = J('../data/db.json');
  const pub = db.articles.filter((a) => a.publishable);
  assert.ok(pub.length > 0);
  for (const a of pub) {
    assert.match(a.url, /^https:\/\//, a.id);
    assert.ok(a.published_at, a.id + ' sin fecha');
    assert.notEqual(a.evidence, 'BAJO', a.id);
    for (const m of a.metrics) assert.equal(typeof m.value, 'number', `${a.id}: ${m.metric}`);
  }
});
