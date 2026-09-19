#!/usr/bin/env node
/* =========================================================================
   AGROVISION_MX — build estático (sin dependencias)
   1. Valida assets/js/data.js (ids únicos, fuentes existentes, URLs https)
   2. Genera /articles/<id>.html y /articles/index.html desde una plantilla
      que reutiliza sprite de iconos, footer y buscador de index.html
   3. Genera sitemap.xml y robots.txt
   4. Verifica que todos los enlaces internos (#ancla y archivos) existan
   Uso: npm run build
   ========================================================================= */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const write = (p, s) => { fs.mkdirSync(path.dirname(path.join(ROOT, p)), { recursive: true }); fs.writeFileSync(path.join(ROOT, p), s); };
const errors = [];
const fail = (m) => errors.push(m);

/* ---------- 1. Datos ---------- */
const sandbox = { globalThis: {} };
vm.runInNewContext(read('assets/js/data.js'), sandbox);
const AGV = sandbox.globalThis.AGV;
if (!AGV) throw new Error('data.js no expuso AGV');
const { SOURCES, articles, SITE, facts, states, data } = AGV;

const ids = new Set();
for (const a of articles) {
  if (!/^[a-z0-9-]+$/.test(a.id)) fail(`Artículo con id inválido: ${a.id}`);
  if (ids.has(a.id)) fail(`Id duplicado: ${a.id}`); ids.add(a.id);
  for (const k of ['title', 'subtitle', 'category', 'date', 'author', 'excerpt', 'body', 'sources', 'image']) if (!a[k]) fail(`${a.id}: falta "${k}"`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(a.date)) fail(`${a.id}: fecha inválida`);
  if (!a.sources.length) fail(`${a.id}: sin fuentes`);
  a.sources.forEach((s) => { if (!SOURCES[s]) fail(`${a.id}: fuente inexistente "${s}"`); });
}
for (const [k, s] of Object.entries(SOURCES)) if (!/^https:\/\//.test(s.url) || !s.name || !s.year) fail(`Fuente incompleta: ${k}`);
facts.forEach((f, i) => { if (!SOURCES[f.source]) fail(`Fact ${i}: fuente inexistente`); });
Object.values(data).forEach((d) => { if (!SOURCES[d.source]) fail(`Dato "${d.title}": fuente inexistente`); });
states.forEach((s) => { if (s.info && s.info.fact && !SOURCES[s.info.source]) fail(`Estado ${s.code}: dato sin fuente`); });

/* ---------- 2. Parciales desde index.html ---------- */
const index = read('index.html');
const grab = (re, name) => { const m = index.match(re); if (!m) throw new Error(`No encontré el parcial: ${name}`); return m[0]; };
const sprite = grab(/<svg width="0" height="0"[\s\S]*?<\/svg>/, 'sprite');
const toArticles = (html) => html
  .replace(/href="#(?!i-)/g, 'href="../index.html#')
  .replace(/href="articles\/"/g, 'href="./"')
  .replace(/(src|href)="assets\//g, '$1="../assets/');
const footer = toArticles(grab(/<footer class="footer">[\s\S]*?<\/footer>/, 'footer'));
const search = toArticles(grab(/<div class="search" id="search"[\s\S]*?<ul class="search__results"[\s\S]*?<\/ul>\s*<\/div>\s*<\/div>/, 'search'));

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmtDate = (iso) => new Date(iso + 'T12:00:00Z').toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

const nav = `<header class="nav is-solid" id="nav" data-solid>
  <div class="wrap nav__in">
    <a class="brand" href="../index.html" aria-label="AGROVISION_MX, ir al inicio">
      <img src="../assets/img/logo-96.webp" width="40" height="40" alt="" class="brand__logo">
      <span class="brand__name">AGRO<b>VISION</b>_MX</span>
    </a>
    <nav class="nav__links" id="menu" aria-label="Principal">
      <a href="../index.html">Inicio</a><a href="../index.html#agrotech">AgroTech</a><a href="../index.html#negocio">Negocios</a><a href="../index.html#mexico">México</a><a href="../index.html#datos">Datos</a><a href="./">Artículos</a>
      <a class="btn btn--primary nav__cta-m" href="../index.html#newsletter">Únete</a>
    </nav>
    <div class="nav__tools">
      <button class="icon-btn" type="button" data-open-search aria-label="Buscar en AGROVISION"><svg class="ic"><use href="#i-search"/></svg></button>
      <button class="icon-btn theme-toggle" type="button" id="themeToggle" aria-label="Cambiar a modo oscuro" aria-pressed="false"><svg class="ic ic-sun"><use href="#i-sun"/></svg><svg class="ic ic-moon"><use href="#i-moon"/></svg></button>
      <a class="btn btn--primary nav__cta" href="../index.html#newsletter">Únete</a>
      <button class="burger" type="button" id="burger" aria-label="Abrir menú" aria-expanded="false" aria-controls="menu"><span></span><span></span><span></span></button>
    </div>
  </div>
</header>`;

const head = ({ title, desc, url, image, jsonld }) => `<!doctype html>
<html lang="es-MX" data-base="../">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
<meta name="theme-color" content="#0B141B">
<meta property="og:type" content="article"><meta property="og:site_name" content="AGROVISION_MX"><meta property="og:locale" content="es_MX">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${url}"><meta property="og:image" content="${image}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(desc)}"><meta name="twitter:image" content="${image}">
<link rel="icon" type="image/png" sizes="64x64" href="../assets/img/favicon-64.png">
<link rel="apple-touch-icon" href="../assets/img/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
<script>(function(){try{var t=localStorage.getItem('agv-theme');if(!t){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme='light'}document.documentElement.classList.add('js')})();</script>
<link rel="stylesheet" href="../assets/css/styles.css">
<script type="application/ld+json">${JSON.stringify(jsonld)}</script>
</head>
<body>
<a class="skip" href="#contenido">Saltar al contenido</a>
${sprite}
${nav}`;

const tail = `${footer}
<button class="to-top" id="toTop" type="button" aria-label="Volver arriba"><svg class="ic"><use href="#i-up"/></svg></button>
${search}
<script src="../assets/js/data.js" defer></script>
<script src="../assets/js/app.js" defer></script>
</body>
</html>
`;

const bodyHtml = (paras) => paras.map((p) => {
  if (p.startsWith('## ')) return `<h2>${esc(p.slice(3))}</h2>`;
  if (p.startsWith('> ')) return `<blockquote>${esc(p.slice(2))}</blockquote>`;
  return `<p>${esc(p)}</p>`;
}).join('\n');

/* ---------- 3. Páginas de artículo ---------- */
const GEN = '<!-- GENERADO por scripts/build.mjs — edita assets/js/data.js, no este archivo -->\n';
const withGen = (html) => html.replace('<!doctype html>\n', '<!doctype html>\n' + GEN);
for (const a of articles) {
  const url = `${SITE.url}articles/${a.id}.html`;
  const jsonld = {
    '@context': 'https://schema.org', '@type': 'Article', headline: a.title, description: a.excerpt, datePublished: a.date, inLanguage: 'es-MX',
    image: [a.image.large], author: { '@type': 'Organization', name: a.author }, mainEntityOfPage: url,
    publisher: { '@type': 'Organization', name: 'AGROVISION_MX', logo: { '@type': 'ImageObject', url: SITE.url + 'assets/img/logo-320.webp' } },
    citation: a.sources.map((s) => SOURCES[s].url)
  };
  const html = withGen(head({ title: `${a.title} — AGROVISION_MX`, desc: a.excerpt, url, image: a.image.large, jsonld }) + `
<main id="contenido">
<article>
  <header class="page-hero">
    <div class="wrap">
      <nav class="crumbs" aria-label="Migas de pan"><a href="../index.html">Inicio</a> / <a href="./">Artículos</a> / <span>${esc(a.category)}</span></nav>
      <p class="eyebrow">${esc(a.category)}</p>
      <h1 class="sh__title" style="margin-top:14px">${esc(a.title)}</h1>
      <p class="sh__lead" style="margin-top:18px">${esc(a.subtitle)}</p>
      <p class="art-meta"><span>${esc(a.author)}</span><time datetime="${a.date}">${fmtDate(a.date)}</time><span>${a.sources.length} fuente${a.sources.length > 1 ? 's' : ''}</span></p>
    </div>
  </header>
  <div class="art-cover">
    <figure>
      <img src="${a.image.large}" srcset="${a.image.small} 640w, ${a.image.src} 1200w, ${a.image.large} 1920w" sizes="(min-width:1100px) 1100px, 100vw" alt="${esc(a.image.alt)}" width="1200" height="600" fetchpriority="high">
    </figure>
    <a class="photo-credit" href="${a.image.page}" target="_blank" rel="noopener">Foto: ${esc(a.image.credit)} / Unsplash</a>
  </div>
  <div class="prose">
${bodyHtml(a.body)}
  </div>
  <section class="sources" aria-labelledby="src-${a.id}">
    <h2 id="src-${a.id}">Fuentes</h2>
    <ol>${a.sources.map((s) => `<li><a href="${SOURCES[s].url}" target="_blank" rel="noopener">${esc(SOURCES[s].name)} · ${esc(SOURCES[s].year)} <svg class="ic" aria-hidden="true"><use href="#i-ext"/></svg></a></li>`).join('')}</ol>
    <p style="margin-top:28px"><a class="btn btn--outline" href="./">← Todos los artículos</a></p>
  </section>
</article>
</main>
` + tail);
  write(`articles/${a.id}.html`, html);
}

/* ---------- 4. Listado de artículos ---------- */
const listUrl = SITE.url + 'articles/';
write('articles/index.html', withGen(head({
  title: 'Artículos — AGROVISION_MX', desc: 'Agro, tecnología, negocios y México: artículos con fuentes verificables.', url: listUrl, image: SITE.url + 'assets/img/og-image.jpg',
  jsonld: { '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Artículos AGROVISION_MX', url: listUrl, hasPart: articles.map((a) => ({ '@type': 'Article', headline: a.title, url: `${SITE.url}articles/${a.id}.html`, datePublished: a.date })) }
}) + `
<main id="contenido">
  <header class="page-hero">
    <div class="wrap">
      <nav class="crumbs" aria-label="Migas de pan"><a href="../index.html">Inicio</a> / <span>Artículos</span></nav>
      <p class="eyebrow">Actualidad</p>
      <h1 class="sh__title" style="margin-top:14px">Lo que está pasando.</h1>
      <p class="sh__lead" style="margin-top:18px">Explicamos agro, tecnología y negocios con fuentes que puedes abrir y revisar.</p>
    </div>
  </header>
  <section class="section page-list" aria-label="Listado de artículos">
    <div class="wrap">
      <div class="filters" role="toolbar" aria-label="Filtrar artículos por categoría" id="filters" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:32px">
        <button type="button" class="chip is-on" data-filter="all" aria-pressed="true">Todos</button>
        <button type="button" class="chip" data-filter="AGRO" aria-pressed="false">Agro</button>
        <button type="button" class="chip" data-filter="TECH" aria-pressed="false">Tech</button>
        <button type="button" class="chip" data-filter="NEGOCIO" aria-pressed="false">Negocio</button>
        <button type="button" class="chip" data-filter="MÉXICO" aria-pressed="false">México</button>
      </div>
      <div class="articles" id="articleGrid" data-limit="999" aria-live="polite"></div>
      <noscript><ul>${articles.map((a) => `<li><a href="${a.id}.html">${esc(a.title)}</a></li>`).join('')}</ul></noscript>
    </div>
  </section>
</main>
` + tail));

/* ---------- 5. sitemap + robots ---------- */
const today = new Date().toISOString().slice(0, 10);
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${SITE.url}</loc><lastmod>${today}</lastmod></url>
  <url><loc>${listUrl}</loc><lastmod>${today}</lastmod></url>
${articles.map((a) => `  <url><loc>${SITE.url}articles/${a.id}.html</loc><lastmod>${a.date}</lastmod></url>`).join('\n')}
</urlset>
`);
write('robots.txt', `User-agent: *\nAllow: /\nSitemap: ${SITE.url}sitemap.xml\n`);

/* ---------- 6. Enlaces internos ---------- */
const pages = ['index.html', 'articles/index.html', ...articles.map((a) => `articles/${a.id}.html`)];
const idsOf = (html) => new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
for (const p of pages) {
  const html = read(p), dir = path.dirname(p);
  for (const m of html.matchAll(/\s(?:href|src)="([^"]+)"/g)) {
    const ref = m[1];
    if (/^(https?:|mailto:|data:|tel:)/.test(ref) || ref.startsWith('#i-')) continue;
    const [file, hash] = ref.split('#');
    const target = file ? path.normalize(path.join(dir, file.endsWith('/') ? file + 'index.html' : file)) : p;
    if (!fs.existsSync(path.join(ROOT, target))) { fail(`${p}: enlace roto → ${ref}`); continue; }
    if (hash && target.endsWith('.html') && !idsOf(read(target)).has(hash)) fail(`${p}: ancla inexistente → ${ref}`);
  }
}

if (errors.length) { console.error('✖ Build con errores:\n  - ' + errors.join('\n  - ')); process.exit(1); }
console.log(`✔ Build OK · ${articles.length} artículos · ${Object.keys(SOURCES).length} fuentes · ${pages.length} páginas verificadas`);
