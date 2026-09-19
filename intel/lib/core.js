/* =========================================================================
   AGROVISION INTELLIGENCE — core (isomórfico: Node 20+ y navegador)
   -------------------------------------------------------------------------
   Funciones puras, sin dependencias ni acceso a red o disco:
     normalize · createItem · classifyArticle · scoreArticle · verifyArticle
     dedupe · detectTrends · analyzeOpportunity · suggestFormats
     generateContent · buildSEO · buildWeekly · toCSV · toMarkdown
   Los conectores (red) viven en lib/connectors y el orquestador en
   lib/pipeline.js. El dashboard importa este mismo archivo.

   Principio editorial: el generador NUNCA crea cifras. Sólo recombina
   campos que ya existen en el ítem (con fuente). Si falta un campo,
   lo deja marcado como [PENDIENTE] y el ítem no es publicable.
   ========================================================================= */

export const VERSION = '1.0.0';
export const BRAND = {
  name: 'AGROVISION_MX',
  tagline: 'Del campo al dato.',
  site: 'https://groupmaglobal-bot.github.io/agrovision-mx/',
  handle: '@agrovision_mx',
  cta: 'Lee el análisis completo en AGROVISION_MX'
};
export const CATEGORIES = ['AGRO', 'TECH', 'BUSINESS', 'MEXICO'];
export const EVIDENCE = ['ALTO', 'MEDIO', 'BAJO'];
export const PUBLISH_THRESHOLD = 55; // puntuación interna mínima para sugerir publicar
export const CONTENT_TYPES = ['newsletter', 'instagram', 'reel', 'article', 'linkedin', 'stories'];

/* ---------- Texto ---------- */
export function normalize(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}
const reCache = new Map();
function termRe(term) {
  let re = reCache.get(term);
  if (!re) {
    const t = normalize(term).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    re = new RegExp('(^|[^a-z0-9])' + t + '(?=[^a-z0-9]|$)', 'g');
    reCache.set(term, re);
  }
  re.lastIndex = 0;
  return re;
}
export function countTerm(normText, term) {
  const m = normText.match(termRe(term));
  return m ? m.length : 0;
}
export function hasTerm(normText, term) { return countTerm(normText, term) > 0; }
export function slugify(s, max = 70) {
  return normalize(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, max).replace(/-+$/, '');
}
export function hash(s) { // FNV-1a 32 bits → 8 hex
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}
export function canonicalUrl(u) {
  try {
    const url = new URL(u);
    url.hash = '';
    [...url.searchParams.keys()].forEach((k) => { if (/^(utm_|fbclid|gclid|mc_|ref$|guccounter)/i.test(k)) url.searchParams.delete(k); });
    url.hostname = url.hostname.replace(/^www\./, '').replace(/^(es|mx|www2)\.(?=[^.]+\.[^.]+$)/, '');
    return (url.protocol + '//' + url.hostname + url.pathname.replace(/\/+$/, '') + (url.search || '')).toLowerCase();
  } catch { return String(u || '').toLowerCase(); }
}
export function domainOf(u) {
  try { return new URL(u).hostname.replace(/^www\./, '').toLowerCase(); } catch { return ''; }
}
const STOP = new Set(normalize('el la los las de del y en a al un una unos unas por para con sin que se su sus es son lo como mas más pero o u ya the of and to in for on with from at by is are an as its it this that mexico méxico 2025 2026').split(' '));
export function tokens(s) {
  return new Set(normalize(s).replace(/[^a-z0-9 ]+/g, ' ').split(' ').filter((w) => w.length > 2 && !STOP.has(w)));
}
export function jaccard(a, b) {
  if (!a.size || !b.size) return 0;
  let i = 0; a.forEach((x) => { if (b.has(x)) i++; });
  return i / (a.size + b.size - i);
}
function daysBetween(a, b) { return Math.round((new Date(b) - new Date(a)) / 86400000); }
function todayISO(now) { return new Date(now || Date.now()).toISOString().slice(0, 10); }

/* ---------- Fuentes ---------- */
export function sourceInfo(url, registry) {
  const d = domainOf(url);
  const domains = (registry && registry.domains) || {};
  let best = null;
  for (const key of Object.keys(domains)) {
    if (d === key || d.endsWith('.' + key)) { if (!best || key.length > best.length) best = key; }
  }
  const unreliable = ((registry && registry.unreliable) || []).some((k) => d === k || d.endsWith('.' + k));
  if (!best) return { domain: d, name: d || 'Desconocida', tier: 0, type: 'secondary', kind: 'desconocido', unreliable };
  return { domain: d, registered: best, ...domains[best], unreliable };
}
export function sourceQuality(tier) { return ({ 1: 10, 2: 7, 3: 4 })[tier] ?? 2; }

/* ---------- Modelo de ítem ---------- */
const ANALYSIS_FIELDS = ['summary', 'why_matters', 'what_changed', 'key_fact', 'impact_producers', 'impact_business', 'impact_mexico', 'business_opportunity'];
export function createItem(raw, ctx = {}) {
  const url = raw.url || raw.link || '';
  const src = sourceInfo(raw.source_url || url, ctx.registry); // source_url: sitio del medio (p. ej. Google News)
  const item = {
    id: raw.id || 'agv-' + hash(canonicalUrl(url) || raw.title_original || raw.title || ''),
    retrieved_at: raw.retrieved_at || new Date(ctx.now || Date.now()).toISOString(),
    ingested_via: raw.ingested_via || ctx.via || 'manual',
    title_original: raw.title_original || raw.title || '',
    title_agrovision: raw.title_agrovision || '',
    source_name: raw.source_name || src.name,
    source_domain: raw.source_domain || src.domain,
    source_type: src.tier ? src.type : (raw.source_type || 'secondary'),
    source_tier: src.tier,
    source_kind: src.kind,
    url,
    canonical_url: canonicalUrl(url),
    published_at: raw.published_at || null,
    country: raw.country || null,
    mx_state: raw.mx_state || null,
    category: raw.category || null,
    subcategory: raw.subcategory || null,
    technologies: raw.technologies || [],
    companies: raw.companies || [],
    content: raw.content || raw.description || '',
    metrics: (raw.metrics || []).map((m) => ({ ...m, retrieved_at: m.retrieved_at || raw.retrieved_at || todayISO(ctx.now) })),
    corroborating_sources: raw.corroborating_sources || [],
    contradictions: raw.contradictions || null,
    verification_notes: raw.verification_notes || '',
    verified_by_fetch: raw.verified_by_fetch === true,
    analyst_evidence: raw.evidence || null,
    flags: raw.flags || {},
    // Lo que aportó la fuente/analista. classifyArticle parte de aquí para que re-clasificar sea idempotente.
    given: { category: raw.category || null, subcategory: raw.subcategory || null, mx_state: raw.mx_state || null, country: raw.country || null, technologies: raw.technologies || [] }
  };
  for (const f of ANALYSIS_FIELDS) item[f] = raw[f] || '';
  for (const f of ['problem', 'solution_tech', 'who', 'small_producer_access', 'investment', 'regulation']) item[f] = raw[f] || null;
  return item;
}
function fullText(item) {
  return normalize([item.title_original, item.title_agrovision, item.summary, item.key_fact, item.what_changed, item.why_matters, item.content,
    item.problem, item.solution_tech, item.who, item.investment, (item.technologies || []).join(' '), (item.companies || []).join(' '), item.mx_state, item.country].join(' \n '));
}

/* ---------- Clasificación ---------- */
export function classifyArticle(item, taxonomy) {
  const text = fullText(item);
  const g = item.given || item;
  const cats = {};
  for (const [cat, def] of Object.entries(taxonomy.categories)) {
    const subs = {};
    let total = 0;
    for (const [sub, terms] of Object.entries(def.subcategories)) {
      let n = 0; for (const t of terms) n += countTerm(text, t);
      if (n) { subs[sub] = n; total += n; }
    }
    cats[cat] = { hits: total, subs };
  }
  const strength = (hits, k) => Math.min(1, hits / k);
  const rel = {
    AGRO: strength(cats.AGRO.hits, 6),
    TECH: strength(cats.TECH.hits, 5),
    BUSINESS: strength(cats.BUSINESS.hits, 6),
    MEXICO: strength(cats.MEXICO.hits, 3)
  };
  // Categoría: la del analista si existe; si no, la de mayor relación (MÉXICO sólo si hay estado concreto)
  let category = g.category && CATEGORIES.includes(g.category) ? g.category : null;
  if (!category) {
    const order = ['TECH', 'BUSINESS', 'AGRO'].sort((a, b) => rel[b] - rel[a]);
    category = order[0];
    // AgroTech: si hay tecnología clara aplicada al agro, la categoría es TECH
    if (rel.TECH >= 0.5 && rel.AGRO >= 0.25) category = 'TECH';
    // MÉXICO como categoría principal sólo si la nota es sobre un estado y no tiene un eje temático fuerte
    const states = Object.keys(cats.MEXICO.subs).filter((s) => s !== 'Nacional');
    if (states.length && rel[category] < 0.5) category = 'MEXICO';
  }
  const top = (subs) => Object.entries(subs).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  let subcategory = g.subcategory || top(cats[category].subs) || null;
  const canon = (t) => { const n = normalize(t); for (const [sub, terms] of Object.entries(taxonomy.categories.TECH.subcategories)) if (normalize(sub) === n || terms.some((x) => normalize(x) === n)) return sub; return t; };
  const tech = new Set((g.technologies || []).map(canon));
  for (const t of Object.keys(cats.TECH.subs)) if (taxonomy.technologies.includes(t)) tech.add(t);
  const states = Object.keys(cats.MEXICO.subs).filter((s) => s !== 'Nacional');
  const country = g.country || (cats.MEXICO.hits ? 'México' : 'Global');
  const inMexico = country === 'México';
  const givenState = g.mx_state === 'Nacional' && !inMexico ? null : g.mx_state; // 'Nacional' sólo aplica a México
  const mx_state = givenState || (states.length === 1 ? states[0] : states.length > 1 ? 'Nacional' : (inMexico && cats.MEXICO.subs.Nacional ? 'Nacional' : null));
  const secondary = CATEGORIES.filter((c) => c !== category && rel[c] >= 0.5);
  return { category, subcategory, secondary_categories: secondary, technologies: [...tech], mx_state, country, relevance: rel, mx_states_detected: states };
}

/* ---------- Puntuación (uso interno, 0-100) ---------- */
export function scoreArticle(item, taxonomy, opts = {}) {
  const now = opts.now || Date.now();
  const rel = item.relevance || classifyArticle(item, taxonomy).relevance;
  const text = fullText(item);
  const hasAny = (list) => list.some((t) => hasTerm(text, t));
  const age = item.published_at ? daysBetween(item.published_at, now) : null;
  const recency = age === null ? 2 : age <= 7 ? 10 : age <= 30 ? 7 : age <= 90 ? 4 : age <= 365 ? 2 : 0;
  const breakdown = {
    agro: +(rel.AGRO * 25).toFixed(1),
    tech: +(rel.TECH * 20).toFixed(1),
    business: +(rel.BUSINESS * 20).toFixed(1),
    mexico: +(Math.max(rel.MEXICO, item.country === 'México' ? 0.8 : 0) * 15).toFixed(1),
    recency,
    source: sourceQuality(item.source_tier)
  };
  const bonuses = {};
  if ((item.metrics || []).length || /\d/.test(item.key_fact || '')) bonuses.datos_nuevos = 10;
  if (hasAny(taxonomy.innovation_terms) && rel.TECH >= 0.34) bonuses.innovacion_concreta = 10;
  if (hasAny(taxonomy.economic_terms) && rel.BUSINESS >= 0.25) bonuses.impacto_economico = 10;
  if (hasAny(taxonomy.producer_terms) || (item.impact_producers && item.impact_producers.length > 20)) bonuses.afecta_productores = 10;
  if (hasAny(taxonomy.practical_terms)) bonuses.aplicacion_practica = 10;
  if (rel.AGRO >= 0.25 && rel.TECH >= 0.34) bonuses.agro_mas_tech = 10;
  const penalties = {};
  if (item.duplicate_of) penalties.duplicado = -30;
  if (item.source_unreliable || (opts.registry && sourceInfo(item.url, opts.registry).unreliable)) penalties.fuente_poco_confiable = -30;
  if (!item.url || (!item.verified_by_fetch && !(item.corroborating_sources || []).length) || hasAny(taxonomy.no_evidence_patterns)) penalties.sin_evidencia = -40;
  const titles = normalize((item.title_original || '') + ' ' + (item.title_agrovision || ''));
  if (taxonomy.clickbait_patterns.some((p) => titles.includes(normalize(p)))) penalties.clickbait = -50;
  if (item.flags && item.flags.false_info) penalties.informacion_falsa = -100;
  const base = Object.values(breakdown).reduce((a, b) => a + b, 0);
  const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);
  const raw = Math.round(base + sum(bonuses) + sum(penalties));
  const score = penalties.informacion_falsa ? 0 : Math.max(0, Math.min(100, raw));
  // score: 0-100 según la especificación. priority: el mismo cálculo sin tope, sólo para ordenar internamente.
  return { score, priority: raw, base: Math.round(base), breakdown, bonuses, penalties };
}

/* ---------- Verificación ---------- */
export function verifyArticle(item, allItems = [], registry) {
  const corroborations = [];
  for (const c of item.corroborating_sources || []) {
    const s = sourceInfo(c.url, registry);
    if (s.domain && s.domain !== item.source_domain) corroborations.push({ name: c.name || s.name, url: c.url, tier: s.tier, type: s.type, via: 'analista' });
  }
  // Corroboración cruzada dentro de la base: ítems relacionados (misma historia) o duplicados de otro dominio
  for (const o of allItems) {
    if (o.id === item.id || o.source_domain === item.source_domain) continue;
    const linked = (item.related_ids || []).includes(o.id) || o.duplicate_of === item.id;
    if (linked && !corroborations.some((c) => domainOf(c.url) === domainOf(o.url))) {
      corroborations.push({ name: o.source_name, url: o.url, tier: o.source_tier, type: o.source_type, via: o.duplicate_of === item.id ? 'misma-historia' : 'relacionado', item_id: o.id });
    }
  }
  const primary = item.source_tier === 1 || item.source_type === 'primary';
  const seriousCorrob = corroborations.filter((c) => c.tier && c.tier <= 2).length;
  const anyCorrob = corroborations.length;
  let computed;
  if (!item.verified_by_fetch && !anyCorrob) computed = 'BAJO';
  else if (primary && item.verified_by_fetch) computed = 'ALTO';
  else if (seriousCorrob >= 1 || anyCorrob >= 2 || (primary && anyCorrob)) computed = 'ALTO';
  else if (item.source_tier === 2 || anyCorrob >= 1) computed = 'MEDIO';
  else computed = 'BAJO';
  // Conservador: si el analista calificó más bajo, manda el analista
  const rank = { ALTO: 3, MEDIO: 2, BAJO: 1 };
  const evidence = item.analyst_evidence && rank[item.analyst_evidence] < rank[computed] ? item.analyst_evidence : computed;
  const warnings = [];
  if (item.contradictions) warnings.push('Las fuentes consultadas difieren: ' + item.contradictions);
  if (!item.published_at) warnings.push('Fecha de publicación no confirmada.');
  if (item.source_kind === 'empresa' && !anyCorrob) warnings.push('Fuente corporativa sin corroboración independiente: presentar como "según la empresa".');
  if (!item.verified_by_fetch) warnings.push('La URL principal no se pudo abrir durante la verificación.');
  const status = evidence === 'BAJO' ? 'NO VERIFICADO' : 'VERIFICADO';
  return {
    evidence, computed_evidence: computed, status,
    source_role: primary ? 'fuente primaria' : 'fuente secundaria',
    corroborations, warnings
  };
}

/* ---------- Duplicados y "misma historia" ----------
   Duplicado (penaliza -30): misma URL canónica, título casi idéntico (≥0.75)
   o misma historia fuerte (similitud ≥0.30 y ≥2 cifras idénticas).
   Relacionado (no penaliza, sirve para corroborar y revisar a mano):
   similitud ≥0.18 y mismo territorio. */
export function numbersOf(item) {
  const vals = [...(item.metrics || []).map((m) => String(m.value)), ...((item.key_fact || '').match(/\d[\d.,]*/g) || []).map((n) => String(parseFloat(n.replace(/,/g, ''))))];
  return new Set(vals.filter((n) => n !== 'NaN' && !/^(19|20)\d\d$/.test(n)));
}
function storyTokens(x) { return tokens(x.title_original + ' ' + x.title_agrovision + ' ' + (x.key_fact || '')); }
export function dedupe(items) {
  const rank = (x) => (x.source_tier || 9) * 100 - (x.metrics || []).length * 5 - (x.analyst_evidence === 'ALTO' ? 10 : 0);
  for (const it of items) { it.duplicate_of = null; it.related_ids = []; }
  const sorted = [...items].sort((a, b) => rank(a) - rank(b));
  const kept = [];
  let dups = 0;
  for (const it of sorted) {
    const tk = storyTokens(it); const tt = tokens(it.title_original); const nums = numbersOf(it);
    let master = null;
    for (const k of kept) {
      if (it.canonical_url && it.canonical_url === k.canonical_url) { master = k; break; }
      if (jaccard(tt, tokens(k.title_original)) >= 0.75) { master = k; break; }
      const sim = jaccard(tk, storyTokens(k));
      const shared = [...nums].filter((n) => numbersOf(k).has(n)).length;
      if (sim >= 0.30 && shared >= 2) { master = k; break; }
      const sameTerritory = (it.mx_state || 'x') === (k.mx_state || 'y') || (it.country && it.country === k.country && !it.mx_state && !k.mx_state);
      if (sim >= 0.18 && sameTerritory) { it.related_ids.push(k.id); k.related_ids.push(it.id); }
    }
    if (master) {
      it.duplicate_of = master.id; dups++;
      if (!master.corroborating_sources.some((c) => c.url === it.url) && it.source_domain !== master.source_domain) master.corroborating_sources.push({ name: it.source_name, url: it.url, via: 'duplicado' });
      const cats = new Set([...(master.secondary_categories || []), it.category].filter((c) => c && c !== master.category));
      master.secondary_categories = [...cats];
    } else kept.push(it);
  }
  return { items, duplicates: dups };
}

/* ---------- Tendencias (TREND SCORE interno) ---------- */
export function detectTrends(items, trendsCfg, opts = {}) {
  const now = opts.now || Date.now();
  const win = trendsCfg.window_days || 30;
  const live = items.filter((i) => !i.duplicate_of);
  const kinds = ['organismo', 'gobierno', 'empresa', 'startup', 'universidad', 'investigacion', 'medio', 'medio_especializado', 'consultora', 'datos'];
  const out = [];
  for (const t of trendsCfg.topics) {
    const hits = live.filter((i) => t.terms.some((term) => hasTerm(fullText(i), term)));
    const recent = hits.filter((i) => i.published_at && daysBetween(i.published_at, now) <= win);
    const prior = hits.filter((i) => i.published_at && daysBetween(i.published_at, now) > win && daysBetween(i.published_at, now) <= win * 4);
    const kindSet = new Set(hits.map((i) => i.source_kind).filter((k) => kinds.includes(k)));
    const primaries = hits.filter((i) => i.source_tier === 1).length;
    const volume = Math.min(1, hits.length / 8);
    const diversity = Math.min(1, kindSet.size / 4);
    const priorRate = prior.length / 3; // ventanas previas promediadas
    const growth = recent.length === 0 ? 0 : Math.min(1, (recent.length - priorRate) / Math.max(1, recent.length));
    const score = Math.round(40 * volume + 30 * diversity + 20 * Math.max(0, growth) + 10 * Math.min(1, primaries / 3));
    out.push({
      id: t.id, label: t.label, score, mentions: hits.length, recent: recent.length, prior: prior.length,
      direction: growth > 0.25 ? 'creciendo' : growth < -0.1 ? 'bajando' : 'estable',
      source_kinds: [...kindSet], primary_sources: primaries,
      item_ids: hits.map((i) => i.id)
    });
  }
  return out.sort((a, b) => b.score - a.score);
}

/* ---------- Oportunidad (las preguntas editoriales) ---------- */
const P = (label) => `[PENDIENTE: ${label}]`;
export function analyzeOpportunity(item) {
  const has = (v) => v && String(v).trim().length > 0;
  return [
    ['¿Qué problema existe?', item.problem],
    ['¿Qué tecnología intenta resolverlo?', item.solution_tech],
    ['¿Quién lo está resolviendo?', item.who || (item.companies || []).join(', ')],
    ['¿Cuánto puede impactar al productor?', item.impact_producers],
    ['¿Existe oportunidad de negocio?', item.business_opportunity],
    ['¿Es aplicable en México?', item.impact_mexico],
    ['¿Es accesible para pequeños productores?', item.small_producer_access],
    ['¿Existe startup o empresa detrás?', (item.companies || []).length ? item.companies.join(', ') : null],
    ['¿Hay inversión?', item.investment],
    ['¿Hay regulación?', item.regulation],
    ['¿Hay evidencia?', item.evidence ? `${item.evidence} · ${item.verification?.source_role || ''}` : null]
  ].map(([q, a]) => ({ q, a: has(a) ? String(a) : 'Sin evidencia en las fuentes consultadas' }));
}

/* ---------- Formatos especiales ---------- */
export function suggestFormats(item) {
  const f = new Set();
  const txt = fullText(item);
  const metrics = (item.metrics || []).length;
  if (metrics) f.add('El dato de la semana');
  if (metrics && (item.country === 'México' || item.mx_state)) f.add('Campo mexicano en números');
  if (item.category === 'TECH' || (item.technologies || []).length) { f.add('AgroTech de la semana'); f.add('Tecnología explicada'); f.add('¿Cómo funciona?'); }
  if (/startup/.test(txt)) f.add('Startup que debes conocer');
  if (item.investment || /inversion|venture|agfunder|pitchbook|adquisicion|acquisition/.test(txt)) f.add('¿Quién está invirtiendo?');
  if (/precio|costo|cost|price|urea|fertiliz/.test(txt)) f.add('¿Cuánto cuesta?');
  if (item.category === 'BUSINESS' || item.business_opportunity) f.add('El negocio detrás del campo');
  if (item.key_fact) f.add('¿Sabías que?');
  if (metrics && (item.technologies || []).length) f.add('Del campo al dato');
  return [...f];
}
export function interviewIdeas(item) {
  const ideas = [];
  for (const c of (item.companies || []).slice(0, 2)) ideas.push(`Entrevista con ${c}: ${item.title_agrovision || item.title_original}. Pregunta guía: ¿qué evidencia tienen de impacto en productores mexicanos?`);
  if (item.mx_state && item.mx_state !== 'Nacional') ideas.push(`Voz local: productor(a) u organización de ${item.mx_state} sobre cómo les afecta este tema.`);
  return ideas;
}

/* ---------- Pipeline puro sobre un ítem ---------- */
export function enrich(item, ctx) {
  const c = classifyArticle(item, ctx.taxonomy);
  Object.assign(item, { category: c.category, subcategory: c.subcategory, secondary_categories: item.secondary_categories?.length ? item.secondary_categories : c.secondary_categories, technologies: c.technologies, mx_state: c.mx_state, country: c.country, relevance: c.relevance });
  return item;
}
export function finalize(items, ctx) {
  for (const it of items) {
    it.verification = verifyArticle(it, items, ctx.registry);
    it.evidence = it.verification.evidence;
    it.scoring = scoreArticle(it, ctx.taxonomy, { now: ctx.now, registry: ctx.registry });
    it.score = it.scoring.score;
    it.priority = it.scoring.priority;
    it.status = it.verification.status;
    it.analysis_complete = ANALYSIS_FIELDS.every((f) => it[f] && String(it[f]).trim());
    it.publishable = !it.duplicate_of && it.evidence !== 'BAJO' && it.analysis_complete && it.score >= PUBLISH_THRESHOLD;
    it.suggested_formats = suggestFormats(it);
    it.suggested_content = it.publishable ? ['newsletter', 'instagram', 'reel', 'article', 'linkedin'].filter((t) => t !== 'reel' || (it.metrics || []).length) : [];
    it.interview_ideas = interviewIdeas(it);
  }
  return items;
}

/* ---------- Generador de contenido ---------- */
function srcLines(item) {
  const list = [{ name: item.source_name, url: item.url, role: item.verification?.source_role || item.source_type }];
  for (const c of item.verification?.corroborations || item.corroborating_sources || []) if (c.url && !list.some((l) => l.url === c.url)) list.push({ name: c.name, url: c.url, role: 'corroboración' });
  return list;
}
function sourcesMd(item) {
  return srcLines(item).map((s) => `- ${s.name} (${s.role}) — ${s.url}`).join('\n') + `\n- Consultado: ${String(item.retrieved_at || '').slice(0, 10)}`;
}
function metricLine(m) {
  const v = typeof m.value === 'number' ? m.value.toLocaleString('es-MX', { maximumFractionDigits: 2 }) : m.value;
  return `${m.metric}: ${v} ${m.unit || ''} (${[m.period, m.region].filter(Boolean).join(', ')}; ${m.source || 'fuente del ítem'})`.replace(/\s+\(/, ' (');
}
function banner(item) {
  const w = [];
  if (!item.publishable) {
    const why = [];
    if (item.duplicate_of) why.push('duplicado');
    if (item.evidence === 'BAJO') why.push('evidencia BAJA');
    if (!item.analysis_complete) why.push('análisis incompleto');
    if ((item.score ?? 0) < PUBLISH_THRESHOLD) why.push('relevancia interna insuficiente');
    w.push(`> ⚠️ **NO VERIFICADO / NO PUBLICAR TODAVÍA** — ${why.join(', ')}. Borrador para revisión editorial.`);
  }
  for (const x of item.verification?.warnings || []) w.push(`> ℹ️ ${x}`);
  return w.length ? w.join('\n') + '\n\n' : '';
}
const or = (v, label) => (v && String(v).trim()) ? String(v).trim() : P(label);
function hook(item) {
  const t = item.title_agrovision || item.title_original;
  return t.replace(/[!¡]+/g, '').trim();
}
function fmtDate(iso) {
  if (!iso) return 'fecha no confirmada';
  return new Date(iso + 'T12:00:00Z').toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

export function generateContent(item, type) {
  const title = item.title_agrovision || item.title_original;
  const tech = (item.technologies || []).join(', ');
  const metrics = (item.metrics || []).slice(0, 4);
  const head = banner(item);
  switch (type) {
    case 'newsletter': return head + [
      `# ${title}`,
      `### ${or(item.what_changed, 'qué cambió')}`,
      ``,
      `**Introducción.** ${or(item.summary, 'resumen')}`,
      ``, `## Qué pasó`, or(item.summary, 'resumen'),
      ``, `## Por qué importa`, or(item.why_matters, 'por qué importa'),
      ``, `## Datos clave`, metrics.length ? metrics.map((m) => '- ' + metricLine(m)).join('\n') : `- ${or(item.key_fact, 'dato principal')}`,
      ``, `## Impacto en México`, or(item.impact_mexico, 'impacto en México'),
      ``, `## Qué significa para productores`, or(item.impact_producers, 'impacto en productores'),
      ``, `## Qué significa para negocios`, or(item.impact_business, 'impacto en negocios'),
      ``, `## La tecnología detrás`, item.solution_tech || (tech ? `Tecnologías involucradas: ${tech}.` : 'Este tema no depende de una tecnología específica; es contexto de mercado para el agro.'),
      ``, `## Conclusión`, or(item.business_opportunity, 'oportunidad'),
      ``, `## Fuentes`, sourcesMd(item),
      ``, `**${BRAND.cta}** → ${BRAND.site}`
    ].join('\n');

    case 'instagram': {
      const slides = [
        ['Hook', hook(item)],
        ['Qué pasó', or(item.what_changed, 'qué cambió')],
        ['El dato', or(item.key_fact, 'dato principal')],
        ['La tecnología', item.solution_tech || (tech ? tech : 'Contexto de mercado: sin tecnología específica en la fuente.')],
        ['¿Por qué importa?', or(item.why_matters, 'por qué importa')],
        ['México', or(item.impact_mexico, 'impacto en México')],
        ['Negocio', or(item.impact_business, 'impacto en negocios')],
        ['Lo que viene', or(item.business_opportunity, 'oportunidad')],
        ['CTA', `Guarda este post y síguenos en ${BRAND.handle}. ${BRAND.tagline}\nFuente: ${item.source_name}`]
      ];
      return head + `# Carrusel Instagram — ${title}\n\n` + slides.map(([k, v], i) => `**SLIDE ${i + 1} · ${k}**\n${v}`).join('\n\n') +
        `\n\n**Caption**\n${or(item.summary, 'resumen')}\n\nFuente: ${item.source_name} (${fmtDate(item.published_at)}).\n${BRAND.tagline}\n\n#AgroTech #CampoMexicano #AGROVISION_MX #${(item.subcategory || 'Agro').replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñ]/g, '')}\n\n**Fuentes**\n${sourcesMd(item)}`;
    }

    case 'reel': return head + [
      `# Reel — ${title}`,
      `| Tiempo | Bloque | Texto en pantalla | Voz en off | B-roll sugerido |`,
      `|---|---|---|---|---|`,
      `| 0–3 s | HOOK | ${hook(item)} | ${hook(item)}. | Toma aérea de campo / parcela |`,
      `| 3–10 s | CONTEXTO | ${or(item.what_changed, 'qué cambió')} | ${or(item.summary, 'resumen')} | Productor(a) en campo, maquinaria |`,
      `| 10–20 s | DATO | ${or(item.key_fact, 'dato')} | Según ${item.source_name}: ${or(item.key_fact, 'dato')} | Gráfico animado con la cifra y la fuente |`,
      `| 20–35 s | EXPLICACIÓN | ${or(item.why_matters, 'por qué importa')} | ${or(item.why_matters, 'por qué importa')} ${or(item.impact_producers, 'impacto productores')} | ${tech ? 'Detalle de ' + tech : 'Mercado, empaque, logística'} |`,
      `| 35–45 s | CONCLUSIÓN | ${or(item.impact_mexico, 'México')} | ${or(item.business_opportunity, 'oportunidad')} | Logo AGROVISION_MX sobre campo |`,
      `| 45 s | CTA | Síguenos · ${BRAND.handle} | Síguenos para entender el campo con datos. | Pantalla final de marca |`,
      ``, `Fuente en pantalla (obligatoria): ${item.source_name}, ${fmtDate(item.published_at)}.`,
      ``, `**Fuentes**`, sourcesMd(item)
    ].join('\n');

    case 'article': {
      const seo = buildSEO(item);
      return head + [
        `---`, `seo_title: "${seo.title}"`, `meta_description: "${seo.description}"`, `keywords: "${seo.keywords.join(', ')}"`, `canonical: "${seo.canonical}"`, `---`, ``,
        `# ${title}`, ``, or(item.summary, 'resumen'), ``,
        `## Qué cambió`, or(item.what_changed, 'qué cambió'), ``,
        `## Por qué importa para el campo`, or(item.why_matters, 'por qué importa'), ' ' + or(item.impact_producers, 'productores'), ``,
        `## El ángulo de negocio`, or(item.impact_business, 'negocios'), ' ' + or(item.business_opportunity, 'oportunidad'), ``,
        `## Datos`, metrics.length ? metrics.map((m) => '- ' + metricLine(m)).join('\n') : `- ${or(item.key_fact, 'dato')}`, ``,
        `## Análisis AGROVISION`, analyzeOpportunity(item).map((x) => `- **${x.q}** ${x.a}`).join('\n'), ``,
        (item.verification?.warnings || []).some((w) => w.startsWith('Las fuentes')) ? `> ${item.verification.warnings.find((w) => w.startsWith('Las fuentes'))}\n` : '',
        `## Conclusión`, or(item.impact_mexico, 'México'), ``,
        `## Fuentes`, sourcesMd(item), ``,
        `## Preguntas frecuentes`,
        `**¿Qué pasó?** ${or(item.what_changed, 'qué cambió')}`,
        `**¿Cuál es el dato principal?** ${or(item.key_fact, 'dato')}`,
        `**¿Qué significa para México?** ${or(item.impact_mexico, 'México')}`, ``,
        '```json', JSON.stringify(seo.schema, null, 2), '```'
      ].join('\n');
    }

    case 'linkedin': return head + [
      `${title}`, ``,
      `${or(item.what_changed, 'qué cambió')}`, ``,
      `📊 El dato: ${or(item.key_fact, 'dato')}`, ``,
      `Por qué importa para el negocio agro:`,
      `→ Mercado: ${or(item.impact_business, 'negocios')}`,
      `→ Productividad: ${or(item.impact_producers, 'productores')}`,
      `→ México: ${or(item.impact_mexico, 'México')}`,
      item.investment ? `→ Inversión: ${item.investment}` : '',
      tech ? `→ Tecnología: ${tech}` : '', ``,
      `Oportunidad estratégica: ${or(item.business_opportunity, 'oportunidad')}`, ``,
      `Fuente: ${item.source_name} · ${fmtDate(item.published_at)} · ${item.url}`, ``,
      `AGROVISION_MX — ${BRAND.tagline}`, `#AgTech #Agronegocios #México #Innovación`
    ].filter((l) => l !== '').join('\n');

    case 'stories': return head + [
      `# Historias — ${title}`,
      `1. Encuesta: "¿Sabías esto?" + ${or(item.key_fact, 'dato')} (Sí / No)`,
      `2. ${or(item.why_matters, 'por qué importa')}`,
      `3. Sticker de enlace → ${BRAND.site} · Fuente: ${item.source_name}`
    ].join('\n');
    default: throw new Error('Tipo de contenido no soportado: ' + type);
  }
}

/* ---------- SEO ---------- */
export function buildSEO(item, site = BRAND.site) {
  const title = (item.title_agrovision || item.title_original);
  const clip = (s, n) => (s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : s);
  const slug = slugify(title);
  const canonical = site + 'intel/a/' + slug;
  const description = clip(item.summary || item.what_changed || title, 155);
  const keywords = [...new Set([item.subcategory, item.category, item.mx_state, ...(item.technologies || []), 'AgroTech', 'campo mexicano'].filter(Boolean))];
  const schema = {
    '@context': 'https://schema.org', '@type': 'Article',
    headline: clip(title, 110), description,
    datePublished: todayISO(), dateModified: todayISO(),
    author: { '@type': 'Organization', name: 'Redacción AGROVISION_MX' },
    publisher: { '@type': 'Organization', name: 'AGROVISION_MX', logo: { '@type': 'ImageObject', url: site + 'assets/img/logo-320.webp' } },
    mainEntityOfPage: canonical, keywords: keywords.join(', '),
    citation: srcLines(item).map((s) => ({ '@type': 'CreativeWork', name: s.name, url: s.url })),
    about: item.subcategory || item.category
  };
  return {
    slug, title: clip(title + ' | AGROVISION_MX', 60), description, keywords, canonical,
    og: { 'og:type': 'article', 'og:title': title, 'og:description': description, 'og:url': canonical, 'og:site_name': 'AGROVISION_MX', 'og:image': site + 'assets/img/og-image.jpg', 'og:locale': 'es_MX' },
    twitter: { 'twitter:card': 'summary_large_image', 'twitter:title': clip(title, 70), 'twitter:description': description, 'twitter:image': site + 'assets/img/og-image.jpg' },
    schema
  };
}

/* ---------- AGROVISION WEEKLY ---------- */
export function buildWeekly(items, trends, opts = {}) {
  const n = opts.issue || 1;
  // Para una edición semanal pesa la actualidad: prioridad interna + bono por recencia
  const nowT = opts.now || Date.now();
  const fresh = (i) => { const d = i.published_at ? daysBetween(i.published_at, nowT) : 999; return d <= 7 ? 30 : d <= 14 ? 15 : d <= 30 ? 5 : -20; };
  const pool = items.filter((i) => i.publishable).sort((a, b) => (b.priority + fresh(b)) - (a.priority + fresh(a)));
  const pick = (fn, used) => pool.find((i) => fn(i) && !used.has(i.id));
  const used = new Set();
  // Top 5 diverso: máximo 2 por categoría
  const top5 = []; const perCat = {};
  const sameStory = (i) => top5.some((t) => (t.related_ids || []).includes(i.id) || jaccard(storyTokens(t), storyTokens(i)) >= 0.12);
  for (const i of pool) { if (top5.length === 5) break; if ((perCat[i.category] || 0) >= 2 || sameStory(i)) continue; top5.push(i); perCat[i.category] = (perCat[i.category] || 0) + 1; }
  top5.forEach((i) => used.add(i.id));
  const agtech = pick((i) => i.category === 'TECH', used); agtech && used.add(agtech.id);
  const negocio = pick((i) => i.category === 'BUSINESS', used); negocio && used.add(negocio.id);
  const mexico = pick((i) => i.category === 'MEXICO' || i.country === 'México', used); mexico && used.add(mexico.id);
  const dato = pool.find((i) => (i.metrics || []).length && i.evidence === 'ALTO' && !used.has(i.id)) || pool.find((i) => (i.metrics || []).length);
  const startup = pool.find((i) => /startup/.test(fullText(i)));
  const tecno = pick((i) => i.category === 'TECH', used) || agtech; tecno && used.add(tecno.id);
  const oportunidad = pool.find((i) => i.business_opportunity && i.category === 'BUSINESS' && !top5.includes(i)) || negocio;
  const line = (i) => i ? `**${i.title_agrovision || i.title_original}** — ${i.summary} *(Fuente: ${i.source_name}, ${fmtDate(i.published_at)} · [enlace](${i.url}))*` : '_Sin ítem verificado esta semana._';
  const t3 = trends.slice(0, 3);
  const out = [
    `# AGROVISION WEEKLY #${String(n).padStart(3, '0')}`,
    `*Lo que está pasando entre el campo, la tecnología y los negocios.*`,
    `Semana al ${fmtDate(opts.date || todayISO(opts.now))} · ${BRAND.tagline}`, ``,
    `## 01 — LO MÁS IMPORTANTE`, ...top5.map((i, k) => `${k + 1}. ${line(i)}`), ``,
    `## 02 — AGROTECH`, line(agtech), ``,
    `## 03 — NEGOCIOS`, line(negocio), ``,
    `## 04 — MÉXICO`, line(mexico), ``,
    `## 05 — EL DATO`, dato ? `> ${dato.key_fact}\n\nFuente: ${dato.source_name} · [enlace](${dato.url})` : '_Sin dato verificado._', ``,
    `## 06 — STARTUP`, startup ? line(startup) : '_Esta semana no encontramos una startup con información verificable suficiente. Preferimos no publicar a publicar sin evidencia._', ``,
    `## 07 — TECNOLOGÍA`, line(tecno), ``,
    `## 08 — OPORTUNIDAD`, oportunidad ? `${oportunidad.business_opportunity}\n\n*(A partir de: ${oportunidad.title_agrovision})*` : '_Sin oportunidad sustentada._', ``,
    `## 09 — LO QUE VIENE`, ...(opts.upcoming || ['_Agregar eventos confirmados de la próxima semana (con fuente)._']), ``,
    `## Tendencias de la semana`, ...t3.map((t, k) => `${k + 1}. **${t.label}** — ${t.mentions} menciones de ${t.source_kinds.length} tipos de fuente (${t.direction}).`), ``,
    `---`, `**Fuentes de esta edición**`,
    ...[...new Map([...top5, agtech, negocio, mexico, dato, startup, tecno, oportunidad].filter(Boolean).map((i) => [i.url, i])).values()].map((i) => `- ${i.source_name}: ${i.url}`),
    ``, `${BRAND.cta} → ${BRAND.site}`
  ];
  return out.join('\n');
}

/* ---------- Exportación ---------- */
export const CSV_FIELDS = ['id', 'published_at', 'title_agrovision', 'title_original', 'source_name', 'url', 'country', 'mx_state', 'category', 'subcategory', 'technologies', 'evidence', 'status', 'score', 'publishable', 'key_fact', 'summary', 'why_matters', 'impact_producers', 'impact_business', 'impact_mexico', 'business_opportunity'];
export function toCSV(items, fields = CSV_FIELDS) {
  const cell = (v) => { const s = Array.isArray(v) ? v.join('; ') : v == null ? '' : String(v); return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  return '﻿' + fields.join(',') + '\n' + items.map((i) => fields.map((f) => cell(i[f])).join(',')).join('\n') + '\n';
}
export function toMarkdown(items) {
  return items.map((i) => [
    `## ${i.title_agrovision || i.title_original}`,
    `- **ID:** ${i.id} · **Fecha:** ${i.published_at || 's/f'} · **Fuente:** [${i.source_name}](${i.url})`,
    `- **Categoría:** ${i.category} / ${i.subcategory || '—'} · **País:** ${i.country || '—'} · **Estado:** ${i.mx_state || '—'}`,
    `- **Evidencia:** ${i.evidence} (${i.status})${i.duplicate_of ? ' · DUPLICADO de ' + i.duplicate_of : ''}`,
    `- **Título original:** ${i.title_original}`,
    ``, i.summary, ``,
    `**¿Por qué importa?** ${i.why_matters}`, ``,
    `**Dato principal:** ${i.key_fact}`, ``
  ].join('\n')).join('\n---\n\n');
}
