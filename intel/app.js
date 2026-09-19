/* AGROVISION INTELLIGENCE — dashboard (ES module, sin dependencias).
   Lee data/db.json (generado por el pipeline) y usa lib/core.js para
   generar contenido, SEO, Weekly y exportaciones en el navegador. */
import * as core from './lib/core.js';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const safeUrl = (u) => (/^https?:\/\//i.test(u || '') ? u : '#');
const fmtDate = (iso) => iso ? new Date(iso + 'T12:00:00Z').toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : 's/f';
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sin almacenamiento */ } }
};

const state = { db: null, cat: '', q: '', trend: null, saved: new Set(store.get('agv-intel-saved', [])), filters: {} };

/* ---------- Carga ---------- */
async function load() {
  const res = await fetch('data/db.json', { cache: 'no-store' });
  if (!res.ok) throw new Error('No se pudo leer data/db.json');
  state.db = await res.json();
  const a = state.db.articles;
  const unique = a.filter((x) => !x.duplicate_of);
  const upd = state.db.meta?.updated_at ? new Date(state.db.meta.updated_at).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
  $('#meta').textContent = `${unique.length} ítems únicos · ${unique.filter((x) => x.publishable).length} listos · ${state.db.trends.length} tendencias · actualizado ${upd}`;
  fillSelect('country', unique.map((x) => x.country));
  fillSelect('state', unique.map((x) => x.mx_state));
  fillSelect('tech', unique.flatMap((x) => x.technologies || []));
  fillSelect('source', unique.map((x) => x.source_name));
  renderTrends();
  render();
}
function fillSelect(name, values) {
  const counts = new Map();
  values.filter(Boolean).forEach((v) => counts.set(v, (counts.get(v) || 0) + 1));
  const sel = $(`#filters [name=${name}]`);
  [...counts].sort((a, b) => a[0].localeCompare(b[0], 'es')).forEach(([v, n]) => sel.add(new Option(`${v} (${n})`, v)));
}

/* ---------- Tendencias ---------- */
function renderTrends() {
  const t = state.db.trends.slice(0, 8);
  const total = state.db.articles.filter((x) => !x.duplicate_of).length;
  $('#trends-note').textContent = `TREND SCORE interno · ventana de 30 días · señal preliminar sobre ${total} ítems`;
  $('#trends').innerHTML = t.map((x) => `<li><button class="trend" type="button" data-trend="${esc(x.id)}" aria-pressed="${state.trend === x.id}">
    <span class="trend__top"><span>${esc(x.label)}</span><span class="trend__dir ${x.direction === 'creciendo' ? 'up' : ''}">${x.direction === 'creciendo' ? '▲ creciendo' : x.direction === 'bajando' ? '▼ bajando' : '■ estable'}</span></span>
    <span class="bar"><i style="width:${x.score}%"></i></span>
    <small>${x.mentions} menciones · ${x.source_kinds.length} tipos de fuente · ${x.primary_sources} primarias</small></button></li>`).join('');
}

/* ---------- Filtro ---------- */
function readFilters() { state.filters = Object.fromEntries(new FormData($('#filters')).entries()); }
function matches(a) {
  const f = state.filters;
  if (state.cat === '__saved') { if (!state.saved.has(a.id)) return false; }
  else if (state.cat && a.category !== state.cat && !(a.secondary_categories || []).includes(state.cat) && !(state.cat === 'MEXICO' && a.country === 'México')) return false;
  if (!f.dups && a.duplicate_of) return false;
  if (state.trend) { const t = state.db.trends.find((x) => x.id === state.trend); if (!t || !t.item_ids.includes(a.id)) return false; }
  if (f.from && (!a.published_at || a.published_at < f.from)) return false;
  if (f.to && (!a.published_at || a.published_at > f.to)) return false;
  if (f.country && a.country !== f.country) return false;
  if (f.state && a.mx_state !== f.state) return false;
  if (f.tech && !(a.technologies || []).includes(f.tech)) return false;
  if (f.source && a.source_name !== f.source) return false;
  if (f.evidence && a.evidence !== f.evidence) return false;
  if (f.ctype === 'publishable' && !a.publishable) return false;
  if (f.ctype === 'review' && a.publishable) return false;
  if (f.ctype === 'reel' && !(a.publishable && (a.metrics || []).length)) return false;
  if (f.ctype?.startsWith('formats:') && !(a.suggested_formats || []).includes(f.ctype.slice(8))) return false;
  if (state.q) {
    const hay = core.normalize([a.title_agrovision, a.title_original, a.summary, a.key_fact, a.source_name, a.mx_state, a.country, a.subcategory, (a.technologies || []).join(' '), (a.companies || []).join(' ')].join(' '));
    if (!core.normalize(state.q).split(' ').every((w) => hay.includes(w))) return false;
  }
  return true;
}
function filtered() {
  const list = state.db.articles.filter(matches);
  return state.filters.sort === 'date'
    ? list.sort((a, b) => (b.published_at || '').localeCompare(a.published_at || ''))
    : list.sort((a, b) => (b.priority ?? b.score) - (a.priority ?? a.score));
}

/* ---------- Render ---------- */
function card(a) {
  const saved = state.saved.has(a.id);
  const warn = !a.publishable
    ? `<div class="warn ${a.evidence === 'BAJO' ? 'warn--bad' : ''}">${a.duplicate_of ? 'Duplicado de otra fuente: se usa como corroboración.' : a.evidence === 'BAJO' ? 'NO VERIFICADO · evidencia insuficiente. No publicar.' : 'Requiere análisis o segunda fuente antes de publicar.'}</div>` : '';
  const contra = a.contradictions ? `<div class="warn">Las fuentes difieren: ${esc(a.contradictions)}</div>` : '';
  return `<article class="card ${a.duplicate_of ? 'is-dup' : ''}" data-id="${esc(a.id)}">
    <div class="card__meta"><span class="chip chip--${esc(a.category)}">${esc(a.category)}</span><span class="chip">${esc(a.subcategory || '—')}</span><span class="ev ev--${esc(a.evidence)}">EVIDENCIA ${esc(a.evidence)}</span><span>${fmtDate(a.published_at)}</span><span>${esc(a.mx_state || a.country || '')}</span></div>
    <h3>${esc(a.title_agrovision || a.title_original)}</h3>
    ${a.title_agrovision ? `<div class="card__orig">Original: ${esc(a.title_original)}</div>` : ''}
    ${a.summary ? `<p>${esc(a.summary)}</p>` : `<p>${esc((a.content || '').slice(0, 280))}</p>`}
    ${a.key_fact ? `<div class="fact">${esc(a.key_fact)}</div>` : ''}
    <div class="card__src">Fuente: <a href="${esc(safeUrl(a.url))}" target="_blank" rel="noopener">${esc(a.source_name)}</a> · ${esc(a.verification?.source_role || a.source_type)}${(a.verification?.corroborations || []).length ? ` · ${a.verification.corroborations.length} corroboración(es)` : ''}</div>
    ${warn}${contra}
    <div class="card__actions">
      <button class="btn btn--sm" data-act="save" aria-pressed="${saved}">${saved ? 'Guardado' : 'Guardar'}</button>
      <button class="btn btn--sm" data-act="analyze">Analizar</button>
      <button class="btn btn--sm" data-act="gen" data-type="instagram">Instagram</button>
      <button class="btn btn--sm" data-act="gen" data-type="newsletter">Newsletter</button>
      <button class="btn btn--sm" data-act="gen" data-type="reel">Reel</button>
      <button class="btn btn--sm" data-act="gen" data-type="article">Artículo</button>
      <button class="btn btn--sm" data-act="gen" data-type="linkedin">LinkedIn</button>
    </div>
  </article>`;
}
function render() {
  readFilters();
  const n = Object.entries(state.filters).filter(([k, v]) => v && k !== 'sort').length + (state.trend ? 1 : 0);
  $('#active-filters').textContent = n ? `${n} activo${n > 1 ? 's' : ''}` : '';
  $('#saved-count').textContent = state.saved.size;
  const isData = state.cat === '__data';
  $('#list').hidden = isData; $('#data').hidden = !isData;
  $('#res-h').textContent = isData ? 'Campo en números' : state.cat === '__saved' ? 'Guardados' : 'Noticias relevantes';
  if (isData) return renderData();
  const list = filtered();
  $('#count').textContent = `${list.length} resultado${list.length === 1 ? '' : 's'}`;
  $('#list').innerHTML = list.length ? list.map(card).join('') : `<div class="empty">Sin resultados con estos filtros.${state.q ? ` Prueba <code>npm run intel -- search "${esc(state.q)}"</code> para buscar en vivo.` : ''}</div>`;
}
function renderData() {
  const q = core.normalize(state.q);
  const rows = state.db.metrics.filter((m) => !q || core.normalize([m.metric, m.region, m.source].join(' ')).includes(q));
  $('#count').textContent = `${rows.length} datos con fuente`;
  $('#data').innerHTML = `<table><thead><tr><th>Métrica</th><th>Valor</th><th>Unidad</th><th>Periodo</th><th>Territorio</th><th>Fuente</th><th>Consulta</th></tr></thead><tbody>${
    rows.map((m) => `<tr><td>${esc(m.metric)}</td><td class="num">${esc(typeof m.value === 'number' ? m.value.toLocaleString('es-MX') : m.value)}</td><td>${esc(m.unit)}</td><td>${esc(m.period)}</td><td>${esc(m.region)}</td><td><a href="${esc(safeUrl(m.url))}" target="_blank" rel="noopener">${esc(m.source)}</a></td><td>${esc(String(m.retrieved_at || '').slice(0, 10))}</td></tr>`).join('')
  }</tbody></table>`;
}

/* ---------- Panel ---------- */
const byId = (id) => state.db.articles.find((a) => a.id === id);
function openPanel(title, body, tools = '') {
  $('#panel-title').textContent = title;
  $('#panel-body').innerHTML = body;
  $('#panel-tools').innerHTML = tools;
  const d = $('#panel');
  if (!d.open) d.showModal();
  $('#panel-body').scrollTop = 0;
}
function analyze(a) {
  const v = a.verification || {};
  const s = a.scoring || {};
  const seo = core.buildSEO(a);
  const kv = [
    ['ID', a.id], ['Fecha de consulta', String(a.retrieved_at || '').slice(0, 10)], ['Título original', a.title_original], ['Título AGROVISION', a.title_agrovision],
    ['Fuente', `<a href="${esc(safeUrl(a.url))}" target="_blank" rel="noopener">${esc(a.source_name)}</a> · ${esc(v.source_role || '')}`], ['Fecha de publicación', fmtDate(a.published_at)],
    ['País', a.country], ['Estado', a.mx_state], ['Categoría', `${a.category} / ${a.subcategory || '—'}${(a.secondary_categories || []).length ? ' · también ' + a.secondary_categories.join(', ') : ''}`],
    ['Resumen', a.summary], ['¿Por qué importa?', a.why_matters], ['¿Qué cambió?', a.what_changed], ['Dato principal', a.key_fact],
    ['Tecnología involucrada', (a.technologies || []).join(', ') || '—'], ['Impacto para productores', a.impact_producers], ['Impacto para empresas', a.impact_business],
    ['Impacto para México', a.impact_mexico], ['Oportunidad de negocio', a.business_opportunity], ['Nivel de evidencia', `<span class="ev ev--${esc(a.evidence)}">${esc(a.evidence)}</span> · ${esc(a.status)}`],
    ['Contenido sugerido', (a.suggested_content || []).join(', ') || 'Ninguno hasta completar verificación'], ['Formatos especiales', (a.suggested_formats || []).join(' · ') || '—']
  ];
  const html = `<dl class="kv">${kv.map(([k, val]) => `<dt>${esc(k)}</dt><dd>${/^<(a|span)/.test(String(val)) || String(val).includes('<span class="ev') ? val : esc(val || '—')}</dd>`).join('')}</dl>
    <h3>Verificación</h3>
    ${(v.warnings || []).map((w) => `<div class="warn" style="margin-bottom:6px">${esc(w)}</div>`).join('') || '<p class="hint">Sin advertencias.</p>'}
    <ul class="qa">${(v.corroborations || []).map((c) => `<li><b>${esc(c.via)}</b><a href="${esc(safeUrl(c.url))}" target="_blank" rel="noopener">${esc(c.name || c.url)}</a></li>`).join('') || '<li>Sin fuentes adicionales. Buscar una segunda fuente antes de publicar.</li>'}</ul>
    ${a.verification_notes ? `<p class="hint" style="margin-top:8px">${esc(a.verification_notes)}</p>` : ''}
    <h3>Oportunidad</h3>
    <ul class="qa">${core.analyzeOpportunity(a).map((x) => `<li><b>${esc(x.q)}</b>${esc(x.a)}</li>`).join('')}</ul>
    <h3>Datos (${(a.metrics || []).length})</h3>
    ${(a.metrics || []).length ? `<div class="data"><table><thead><tr><th>Métrica</th><th>Valor</th><th>Unidad</th><th>Periodo</th><th>Territorio</th></tr></thead><tbody>${a.metrics.map((m) => `<tr><td>${esc(m.metric)}</td><td class="num">${esc(m.value)}</td><td>${esc(m.unit)}</td><td>${esc(m.period)}</td><td>${esc(m.region)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="hint">Sin cifras estructuradas.</p>'}
    <h3>Ideas de entrevista</h3>
    <ul class="qa">${(a.interview_ideas || []).map((x) => `<li>${esc(x)}</li>`).join('') || '<li>—</li>'}</ul>
    <h3>Puntuación interna (no publicar)</h3>
    <div class="score"><span>score ${s.score}</span><span>prioridad ${s.priority}</span>${Object.entries(s.breakdown || {}).map(([k, x]) => `<span>${esc(k)} ${x}</span>`).join('')}${Object.entries(s.bonuses || {}).map(([k, x]) => `<span class="pos">+${x} ${esc(k)}</span>`).join('')}${Object.entries(s.penalties || {}).map(([k, x]) => `<span class="neg">${x} ${esc(k)}</span>`).join('')}</div>
    <h3>SEO</h3>
    <pre class="md">${esc(`title: ${seo.title}\ndescription: ${seo.description}\nkeywords: ${seo.keywords.join(', ')}\ncanonical: ${seo.canonical}\n\n${Object.entries({ ...seo.og, ...seo.twitter }).map(([k, x]) => `<meta ${k.startsWith('og:') ? 'property' : 'name'}="${k}" content="${x}">`).join('\n')}\n\n<script type="application/ld+json">\n${JSON.stringify(seo.schema, null, 2)}\n</script>`)}</pre>`;
  const tools = ['instagram', 'newsletter', 'reel', 'article', 'linkedin', 'stories'].map((t) => `<button class="btn btn--sm" data-act="gen" data-type="${t}" data-id="${esc(a.id)}">${t}</button>`).join('');
  openPanel('Análisis · ' + (a.title_agrovision || a.title_original), html, tools);
}
const LABEL = { instagram: 'Carrusel Instagram', newsletter: 'Newsletter', reel: 'Reel', article: 'Artículo web', linkedin: 'LinkedIn', stories: 'Historias' };
const FILE = { instagram: 'instagram.md', newsletter: 'newsletter.md', reel: 'reel.md', article: 'article.md', linkedin: 'linkedin.md', stories: 'stories.md' };
function showMarkdown(title, md, filename) {
  state.current = { md, filename };
  openPanel(title, `<pre class="md">${esc(md)}</pre>`, `<button class="btn btn--sm btn--primary" data-act="copy">Copiar</button><button class="btn btn--sm" data-act="download">Descargar .md</button>`);
}
function generate(a, type) {
  showMarkdown(`${LABEL[type]} · ${a.title_agrovision || a.title_original}`, core.generateContent(a, type), `${core.slugify(a.title_agrovision || a.title_original, 40)}-${FILE[type]}`);
}

/* ---------- Exportar / descargar ---------- */
function download(name, text, type = 'text/markdown') {
  const url = URL.createObjectURL(new Blob([text], { type: type + ';charset=utf-8' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function exportAs(fmt) {
  const items = state.cat === '__data' ? state.db.metrics : filtered();
  const day = new Date().toISOString().slice(0, 10);
  if (fmt === 'json') download(`agrovision-intel-${day}.json`, JSON.stringify(items, null, 2), 'application/json');
  if (fmt === 'csv') download(`agrovision-intel-${day}.csv`, state.cat === '__data' ? core.toCSV(items, ['metric', 'value', 'unit', 'period', 'region', 'source', 'url', 'retrieved_at', 'article_id']) : core.toCSV(items), 'text/csv');
  if (fmt === 'md') download(`agrovision-intel-${day}.md`, state.cat === '__data' ? items.map((m) => `- ${m.metric}: ${m.value} ${m.unit} (${m.period}, ${m.region}) — ${m.source} ${m.url}`).join('\n') : core.toMarkdown(items));
  toast(`Exportado ${items.length} registro(s) en ${fmt.toUpperCase()}`);
}
let tt;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(tt); tt = setTimeout(() => { t.hidden = true; }, 2200); }

/* ---------- Eventos ---------- */
let qTimer;
$('#q').addEventListener('input', (e) => { clearTimeout(qTimer); qTimer = setTimeout(() => { state.q = e.target.value.trim(); render(); }, 120); });
$('.tabs').addEventListener('click', (e) => {
  const b = e.target.closest('[role=tab]'); if (!b) return;
  $$('.tabs [role=tab]').forEach((x) => x.setAttribute('aria-selected', x === b));
  state.cat = b.dataset.cat; render();
});
$('#trends').addEventListener('click', (e) => {
  const b = e.target.closest('[data-trend]'); if (!b) return;
  state.trend = state.trend === b.dataset.trend ? null : b.dataset.trend;
  renderTrends(); render();
});
$('#filters').addEventListener('input', render);
$('#filters').addEventListener('reset', () => { state.trend = null; setTimeout(() => { renderTrends(); render(); }); });
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-act]');
  if (b) {
    const id = b.dataset.id || b.closest('[data-id]')?.dataset.id;
    const a = id && byId(id);
    if (b.dataset.act === 'save' && a) {
      state.saved.has(a.id) ? state.saved.delete(a.id) : state.saved.add(a.id);
      store.set('agv-intel-saved', [...state.saved]);
      toast(state.saved.has(a.id) ? 'Guardado' : 'Quitado de guardados'); render();
    }
    if (b.dataset.act === 'analyze' && a) analyze(a);
    if (b.dataset.act === 'gen' && a) generate(a, b.dataset.type);
    if (b.dataset.act === 'copy' && state.current) navigator.clipboard?.writeText(state.current.md).then(() => toast('Copiado'), () => toast('No se pudo copiar'));
    if (b.dataset.act === 'download' && state.current) download(state.current.filename, state.current.md);
  }
  if (e.target.closest('[data-close]')) $('#panel').close();
  const exp = e.target.closest('[data-export]');
  if (exp) { exportAs(exp.dataset.export); $('#export-menu').hidden = true; $('#btn-export').setAttribute('aria-expanded', 'false'); }
  else if (!e.target.closest('.menu')) { $('#export-menu').hidden = true; $('#btn-export').setAttribute('aria-expanded', 'false'); }
});
$('#panel').addEventListener('click', (e) => { if (e.target === e.currentTarget) e.currentTarget.close(); });
$('#btn-export').addEventListener('click', () => { const m = $('#export-menu'); m.hidden = !m.hidden; $('#btn-export').setAttribute('aria-expanded', String(!m.hidden)); });
$('#btn-weekly').addEventListener('click', () => {
  const issue = (state.db.newsletter_issues || []).length || 1;
  showMarkdown(`AGROVISION WEEKLY · borrador automático`, core.buildWeekly(state.db.articles, state.db.trends, { issue }), `agrovision-weekly-${String(issue).padStart(3, '0')}.md`);
});
$('#btn-theme').addEventListener('click', () => {
  const r = document.documentElement; r.dataset.theme = r.dataset.theme === 'dark' ? 'light' : 'dark';
  try { localStorage.setItem('agv-theme', r.dataset.theme); } catch { /* */ }
});
document.addEventListener('keydown', (e) => { if (e.key === '/' && document.activeElement.tagName !== 'INPUT') { e.preventDefault(); $('#q').focus(); } });
if (matchMedia('(max-width:900px)').matches) $('#filters-box').open = false;

load().catch((e) => { $('#meta').textContent = 'Error: ' + e.message; $('#list').innerHTML = `<div class="empty">${esc(e.message)}. Ejecuta <code>npm run intel -- recompute</code>.</div>`; });
