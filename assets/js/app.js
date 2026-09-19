/* =========================================================================
   AGROVISION_MX — App (vanilla JS, sin dependencias)
   Componentes: Theme · Navbar · Reveal · Hero(Parallax, HUD, Partículas)
   DataCards · MexicoMap · Facts · ArticleGrid(+filtros) · Search
   Newsletter · BackToTop
   Se usa en index.html y en /articles/ (detecta qué existe en la página).
   ========================================================================= */
(function () {
  'use strict';
  var AGV = window.AGV || {};
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var BASE = document.documentElement.getAttribute('data-base') || '';   // '' en home, '../' en /articles/
  var nf = new Intl.NumberFormat('es-MX');
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var src = function (id) { return (AGV.SOURCES || {})[id]; };
  var srcLink = function (id, extraCls) {
    var s = src(id); if (!s) return '';
    return '<a class="src ' + (extraCls || '') + '" href="' + s.url + '" target="_blank" rel="noopener">Fuente: ' + esc(s.name) + ' · ' + esc(s.year) + '</a>';
  };
  var fmtDate = function (iso) {
    var d = new Date(iso + 'T12:00:00');
    return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  /* ---------------- Theme ---------------- */
  function initTheme() {
    var btn = $('#themeToggle'); if (!btn) return;
    var root = document.documentElement;
    var sync = function () {
      var dark = root.dataset.theme === 'dark';
      btn.setAttribute('aria-pressed', String(dark));
      btn.setAttribute('aria-label', dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
    };
    sync();
    btn.addEventListener('click', function () {
      root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem('agv-theme', root.dataset.theme); } catch (e) {}
      sync();
    });
  }

  /* ---------------- Navbar ---------------- */
  function initNav() {
    var nav = $('#nav'); if (!nav) return;
    var forceSolid = nav.hasAttribute('data-solid');
    var onScroll = function () { nav.classList.toggle('is-solid', forceSolid || window.scrollY > 24); };
    window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

    var burger = $('#burger'), menu = $('#menu');
    var setOpen = function (open) {
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
      menu.classList.toggle('open', open);
      document.body.classList.toggle('menu-open', open);
    };
    if (burger && menu) {
      burger.addEventListener('click', function () { setOpen(burger.getAttribute('aria-expanded') !== 'true'); });
      $$('a', menu).forEach(function (a) { a.addEventListener('click', function () { setOpen(false); }); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menu.classList.contains('open')) { setOpen(false); burger.focus(); } });
      window.addEventListener('resize', function () { if (window.innerWidth > 980) setOpen(false); });
    }

    // Sección activa
    var links = $$('.nav__links a[href^="#"]:not(.btn)');
    var map = {};
    links.forEach(function (a) { var el = document.getElementById(a.getAttribute('href').slice(1)); if (el) map[el.id] = a; });
    if ('IntersectionObserver' in window && links.length) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting && map[en.target.id]) {
            links.forEach(function (l) { l.removeAttribute('aria-current'); });
            map[en.target.id].setAttribute('aria-current', 'true');
          }
        });
      }, { rootMargin: '-45% 0px -50% 0px' });
      Object.keys(map).forEach(function (id) { io.observe(document.getElementById(id)); });
    }
  }

  /* ---------------- Reveal + counters ---------------- */
  function countUp(el) {
    var to = parseFloat(el.getAttribute('data-count')), dec = +(el.getAttribute('data-dec') || 0);
    var suffix = el.getAttribute('data-suffix') || '';
    var fmt = function (v) { return (dec ? v.toFixed(dec) : nf.format(Math.round(v))) + suffix; };
    if (reduce) { el.textContent = fmt(to); return; }
    var t0 = null, dur = 1400;
    var step = function (t) {
      if (!t0) t0 = t;
      var p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 4);
      el.textContent = fmt(to * e);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  var revealIO = null;
  function observeReveal(scope) {
    var els = $$('.reveal:not(.is-in), [data-inview]:not(.is-in)', scope);
    if (!('IntersectionObserver' in window)) { els.forEach(function (e) { e.classList.add('is-in'); }); $$('[data-count]', scope).forEach(countUp); return; }
    if (!revealIO) {
      revealIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          en.target.classList.add('is-in');
          $$('[data-count]', en.target).forEach(function (c) { if (!c.dataset.done) { c.dataset.done = 1; countUp(c); } });
          revealIO.unobserve(en.target);
        });
      }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });
    }
    els.forEach(function (e) { revealIO.observe(e); });
  }

  /* ---------------- Hero ---------------- */
  function initHero() {
    var hero = $('.hero'); if (!hero) return;
    var media = $('.hero__media', hero), hud = $('.hud', hero);
    setTimeout(function () { hud && hud.classList.add('hud-on'); }, reduce ? 0 : 650);
    if (reduce) return;

    // Parallax (scroll) + inclinación sutil del HUD (mouse, solo pointer fine)
    var ticking = false, mx = 0, my = 0, inView = true;
    var apply = function () {
      ticking = false;
      var y = window.scrollY;
      if (y < window.innerHeight * 1.2) media.style.transform = 'translate3d(0,' + (y * 0.18).toFixed(1) + 'px,0)';
      if (hud) hud.style.transform = 'translate3d(' + (mx * 10).toFixed(1) + 'px,' + (my * 10 - y * 0.06).toFixed(1) + 'px,0)';
    };
    var req = function () { if (!ticking) { ticking = true; requestAnimationFrame(apply); } };
    window.addEventListener('scroll', req, { passive: true });
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      hero.addEventListener('pointermove', function (e) {
        var r = hero.getBoundingClientRect();
        mx = (e.clientX - r.left) / r.width - 0.5; my = (e.clientY - r.top) / r.height - 0.5; req();
      });
    }

    // Números "en vivo" (UI conceptual): cambio lento con blur de 2px
    var live = $$('[data-live]', hero);
    setInterval(function () {
      if (document.hidden || !inView) return;
      live.forEach(function (el, i) {
        setTimeout(function () {
          var base = parseFloat(el.dataset.live), range = parseFloat(el.dataset.range), dec = +el.dataset.dec;
          var v = base + (Math.random() * 2 - 1) * range;
          el.classList.add('swap');
          setTimeout(function () { el.textContent = v.toFixed(dec); el.classList.remove('swap'); }, 220);
        }, i * 140);
      });
    }, 3600);

    // Partículas muy sutiles
    var cv = $('#particles');
    if (cv && cv.getContext) {
      var ctx = cv.getContext('2d'), dpr = Math.min(window.devicePixelRatio || 1, 2), W, H, P = [];
      var size = function () {
        W = cv.clientWidth; H = cv.clientHeight; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        var n = Math.round(Math.min(46, W / 30)); P = [];
        for (var i = 0; i < n; i++) P.push({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.4 + 0.4, vy: -(Math.random() * 0.25 + 0.05), vx: (Math.random() - 0.5) * 0.12, a: Math.random() * 0.5 + 0.15 });
      };
      size(); window.addEventListener('resize', size);
      if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { inView = e[0].isIntersecting; }).observe(hero);
      var loop = function () {
        if (inView && !document.hidden) {
          ctx.clearRect(0, 0, W, H);
          for (var i = 0; i < P.length; i++) {
            var p = P[i]; p.x += p.vx; p.y += p.vy;
            if (p.y < -5) { p.y = H + 5; p.x = Math.random() * W; }
            ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fillStyle = 'rgba(134,239,172,' + p.a + ')'; ctx.fill();
          }
        }
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    }
  }

  /* ---------------- DataCards ---------------- */
  function renderData() {
    var grid = $('#dataGrid'); if (!grid || !AGV.data) return;
    var d = AGV.data, h = '';
    // Agua (dona)
    var circ = 2 * Math.PI * 54, off = 0, segs = '';
    d.water.parts.forEach(function (p) {
      var len = circ * p.value / 100;
      segs += '<circle class="seg" cx="75" cy="75" r="54" stroke="var(--' + (p.color === 'green' ? 'green' : p.color) + ')" stroke-dasharray="' + len.toFixed(1) + ' ' + (circ - len).toFixed(1) + '" stroke-dashoffset="' + (-off).toFixed(1) + '"/>';
      off += len;
    });
    h += '<article class="dcard dcard--wide reveal" data-inview><h3>' + d.water.title + '</h3><div class="donut-wrap">' +
      '<svg class="donut" viewBox="0 0 150 150" role="img" aria-label="Agricultura 69 %, industria 19 %, municipal 12 %"><circle cx="75" cy="75" r="54" stroke="var(--line)"/>' + segs + '<text x="75" y="82" text-anchor="middle" font-size="26" font-weight="800" fill="currentColor">69%</text></svg>' +
      '<div class="legend" style="flex-direction:column">' + d.water.parts.map(function (p) { return '<span><i class="c-' + p.color + '"></i>' + p.label + ' · <strong>' + p.value + ' %</strong></span>'; }).join('') + '</div></div>' + srcLink(d.water.source) + '</article>';
    // Superávit (barra apilada)
    h += '<article class="dcard dcard--wide dcard--dark reveal" data-inview><h3>' + d.trade.title + '</h3>' +
      '<p class="big"><span data-count="' + d.trade.total + '">0</span><small>' + d.trade.unit + '</small></p>' +
      '<div class="stack" role="img" aria-label="Agroindustrial 3,153 y agropecuario y pesquero 577 millones de dólares">' + d.trade.parts.map(function (p) { return '<i class="c-' + p.color + '" style="--w:' + (p.value / d.trade.total * 100).toFixed(1) + '%"></i>'; }).join('') + '</div>' +
      '<div class="legend">' + d.trade.parts.map(function (p) { return '<span><i class="c-' + p.color + '"></i>' + p.label + ' · ' + nf.format(p.value) + '</span>'; }).join('') + '</div>' + srcLink(d.trade.source) + '</article>';
    // Censo (kv)
    h += '<article class="dcard reveal" data-inview><h3>' + d.census.title + '</h3><div class="kv">' + d.census.items.map(function (i) { return '<div><strong data-count="' + i.value + '">0</strong><span>' + i.label + '</span></div>'; }).join('') + '</div>' + srcLink(d.census.source) + '</article>';
    // Agricultura protegida
    h += '<article class="dcard reveal" data-inview><h3>' + d.protectedAg.title + '</h3><div class="kv">' + d.protectedAg.items.map(function (i) { return '<div><strong data-count="' + i.value + '" data-suffix="' + i.suffix + '">0</strong><span>' + i.label + '</span></div>'; }).join('') + '</div>' + srcLink(d.protectedAg.source) + '</article>';
    // Población
    var max = Math.max.apply(null, d.population.points.map(function (p) { return p.value; }));
    h += '<article class="dcard dcard--dark reveal" data-inview><h3>' + d.population.title + ' · ' + d.population.unit + '</h3><div class="pop" role="img" aria-label="8.2 mil millones en 2024; máximo de 10.3 mil millones a mediados de 2080">' +
      d.population.points.map(function (p) { return '<div class="pop__bar"><strong>' + p.value + '</strong><i style="--h:' + (p.value / max * 100).toFixed(0) + '%"></i><span>' + p.label + '</span></div>'; }).join('') + '</div>' + srcLink(d.population.source) + '</article>';
    // Satélites
    h += '<article class="dcard dcard--wide reveal" data-inview style="grid-column:1/-1"><h3>' + d.satellite.title + '</h3><div class="tiles">' + d.satellite.items.map(function (i) { return '<div><strong data-count="' + i.value + '" data-suffix="' + i.suffix + '">0</strong><span>' + i.label + '</span></div>'; }).join('') + '</div>' + srcLink(d.satellite.source) + '</article>';
    grid.innerHTML = h;
    // la dona se "dibuja" al entrar
    if (!reduce) $$('.donut .seg', grid).forEach(function (s) { var full = s.getAttribute('stroke-dasharray'); s.dataset.full = full; s.setAttribute('stroke-dasharray', '0 999'); });
    var donutCard = $('.donut', grid) && $('.donut', grid).closest('.dcard');
    if (donutCard && 'IntersectionObserver' in window && !reduce) {
      var io = new IntersectionObserver(function (e) { if (e[0].isIntersecting) { $$('.seg', donutCard).forEach(function (s) { s.setAttribute('stroke-dasharray', s.dataset.full); }); io.disconnect(); } }, { threshold: 0.3 });
      io.observe(donutCard);
    }
  }

  /* ---------------- MexicoMap ---------------- */
  function initMap() {
    var map = $('#mxMap'), panel = $('#mxPanel'); if (!map || !AGV.states) return;
    map.innerHTML = AGV.states.map(function (s) {
      return '<button type="button" class="st' + (s.featured ? ' is-feat' : '') + '" style="grid-column:' + (s.x + 1) + ';grid-row:' + (s.y + 1) + '" data-code="' + s.code + '" aria-label="' + esc(s.name) + (s.featured ? ', región destacada' : ', próximamente') + '">' + s.code + '</button>';
    }).join('');
    var chips = $('#mxChips') || document.createElement('div');
    chips.innerHTML = AGV.states.filter(function (s) { return s.featured; }).map(function (s) {
      return '<button type="button" class="chip" data-code="' + s.code + '" aria-pressed="false">' + esc(s.name) + '</button>';
    }).join('');
    chips.addEventListener('click', function (e) { var b = e.target.closest('[data-code]'); if (b) show(b.dataset.code); });
    var show = function (code) {
      var s = AGV.states.filter(function (x) { return x.code === code; })[0]; if (!s) return;
      $$('.st', map).forEach(function (b) { b.classList.toggle('is-active', b.dataset.code === code); });
      $$('.chip', chips).forEach(function (b) { var on = b.dataset.code === code; b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', String(on)); });
      var f = s.info, h = '<p class="code">' + s.code + ' · MÉXICO</p><h3>' + esc(s.name) + '</h3>';
      if (f && f.fact) {
        h += '<span class="cat">' + esc(f.category) + '</span><p class="fact-t">' + esc(f.fact) + '</p>' + srcLink(f.source) + (f.source2 ? srcLink(f.source2) : '');
      } else if (f) {
        h += '<span class="cat">' + esc(f.category) + '</span><p class="soon">Próximamente: estamos verificando datos con fuente oficial.</p>';
      } else {
        h += '<p class="soon">Próximamente</p>';
      }
      panel.innerHTML = h;
    };
    map.addEventListener('mouseover', function (e) { var b = e.target.closest('.st'); if (b) show(b.dataset.code); });
    map.addEventListener('focusin', function (e) { var b = e.target.closest('.st'); if (b) show(b.dataset.code); });
    map.addEventListener('click', function (e) { var b = e.target.closest('.st'); if (b) show(b.dataset.code); });
    show('AGS');
  }

  /* ---------------- ¿Sabías que? ---------------- */
  function initFacts() {
    var t = $('#factText'), s = $('#factSrc'), btn = $('#factNext'), dots = $('#factDots');
    if (!t || !AGV.facts) return;
    var i = 0, F = AGV.facts;
    dots.innerHTML = F.map(function () { return '<i></i>'; }).join('');
    var paint = function () {
      var f = F[i], so = src(f.source);
      t.textContent = f.text;
      s.textContent = 'Fuente: ' + so.name + ' · ' + so.year; s.href = so.url;
      $$('i', dots).forEach(function (d, k) { d.classList.toggle('on', k === i); });
    };
    paint();
    btn.addEventListener('click', function () {
      i = (i + 1) % F.length;
      if (reduce) return paint();
      t.classList.add('is-out');
      setTimeout(function () { paint(); t.classList.remove('is-out'); }, 280);
    });
  }

  /* ---------------- ArticleGrid + filtros ---------------- */
  var TECH = ['AGROTECH', 'INNOVACIÓN'];
  function articleCard(a, i) {
    var p = a.image, s = src(a.sources[0]);
    return '<article class="acard" data-cat="' + a.category + '" style="--i:' + i + '">' +
      '<div class="acard__img"><img loading="lazy" decoding="async" src="' + p.small + '" alt="' + esc(p.alt) + '" width="640" height="400"><span class="acard__cat">' + a.category + '</span></div>' +
      '<div class="acard__body"><p class="acard__meta"><time datetime="' + a.date + '">' + fmtDate(a.date) + '</time> · ' + esc(a.author) + '</p>' +
      '<h3><a href="' + BASE + 'articles/' + a.id + '.html">' + esc(a.title) + '</a></h3><p>' + esc(a.excerpt) + '</p>' +
      '<div class="acard__foot"><span class="acard__more">Leer más <svg class="ic" aria-hidden="true"><use href="#i-arrow"/></svg></span>' +
      (s ? '<a class="src" href="' + s.url + '" target="_blank" rel="noopener">' + esc(s.name) + ' · ' + esc(s.year) + '</a>' : '') + '</div></div></article>';
  }
  function initArticles() {
    var grid = $('#articleGrid'); if (!grid || !AGV.articles) return;
    var limit = +(grid.getAttribute('data-limit') || 6);
    grid.innerHTML = AGV.articles.slice(0, limit).map(articleCard).join('');
    var bar = $('#filters'); if (!bar) return;
    bar.addEventListener('click', function (e) {
      var b = e.target.closest('[data-filter]'); if (!b) return;
      var f = b.dataset.filter, n = 0;
      $$('.chip', bar).forEach(function (c) { var on = c === b; c.classList.toggle('is-on', on); c.setAttribute('aria-pressed', String(on)); });
      var cards = $$('.acard', grid);
      cards.forEach(function (c) {
        var cat = c.dataset.cat;
        var ok = f === 'all' || cat === f || (f === 'TECH' && TECH.indexOf(cat) > -1);
        c.classList.toggle('is-hidden', !ok);
        c.classList.remove('is-enter');
        if (ok) { c.style.setProperty('--i', n++); void c.offsetWidth; if (!reduce) c.classList.add('is-enter'); }
      });
      var empty = $('.empty', grid);
      if (!n && !empty) grid.insertAdjacentHTML('beforeend', '<p class="empty">Todavía no hay artículos en esta categoría.</p>');
      if (n && empty) empty.remove();
    });
  }

  /* ---------------- Search ---------------- */
  function buildIndex() {
    var idx = [], home = BASE ? BASE + 'index.html' : '';
    var catOf = { AGRO: 'Agro', AGROTECH: 'AgroTech', 'INNOVACIÓN': 'AgroTech', NEGOCIO: 'Negocio', 'MÉXICO': 'México' };
    (AGV.articles || []).forEach(function (a) { idx.push({ cat: catOf[a.category] || 'Agro', t: a.title, d: a.excerpt, u: BASE + 'articles/' + a.id + '.html', k: a.body.join(' ') }); });
    [
      ['Agro', 'El agro está cambiando', 'Agro, Tech y Negocio: cómo se produce, se transforma y se genera valor.', '#cambio'],
      ['AgroTech', 'Inteligencia artificial', 'Modelos que ayudan a analizar cultivos, detectar riesgos y apoyar decisiones.', '#agrotech'],
      ['AgroTech', 'Drones', 'Imágenes aéreas para monitorear cultivos y optimizar recorridos.', '#agrotech'],
      ['AgroTech', 'Sensores + IoT', 'Humedad, temperatura, clima y suelo en tiempo real.', '#agrotech'],
      ['AgroTech', 'Agricultura de precisión', 'Agua, fertilizante e insumos donde realmente se necesitan.', '#agrotech'],
      ['AgroTech', 'Automatización', 'Maquinaria, robots y sistemas de mayor precisión.', '#agrotech'],
      ['AgroTech', 'Satélites + datos', 'Imágenes geoespaciales de grandes superficies agrícolas. Sentinel-2, NDVI.', '#agrotech'],
      ['Negocio', 'El campo también es negocio', 'Costos, margen, inversión, mercados, exportación y startups.', '#negocio'],
      ['Negocio', 'Cómo se forma el margen', 'Costo de producción, producción, precio, ingreso y margen.', '#negocio'],
      ['Datos', 'Agua y agricultura', '69 % de las extracciones de agua dulce del mundo · FAO AQUASTAT.', '#datos'],
      ['Datos', 'Superávit agroalimentario 2025', '3,730 millones de dólares · SADER-SIAP.', '#datos'],
      ['Datos', 'Censo Agropecuario 2022', 'Unidades de producción y agricultura protegida · INEGI.', '#datos'],
      ['Datos', 'Población mundial', '8.2 mil millones en 2024 · ONU.', '#datos'],
      ['Datos', 'Sentinel-2', '10 m de resolución, revisita de 5 días · ESA.', '#datos'],
      ['Agro', 'Newsletter Field Notes', 'Lo más relevante del agro en tu correo.', '#newsletter'],
      ['Agro', 'Comunidad', 'Productores, empresas y talento.', '#comunidad']
    ].forEach(function (r) { idx.push({ cat: r[0], t: r[1], d: r[2], u: home + r[3], k: '' }); });
    (AGV.states || []).forEach(function (s) {
      idx.push({ cat: 'México', t: s.name, d: s.info && s.info.fact ? s.info.fact : 'Próximamente', u: home + '#mexico', k: s.info ? s.info.category : '' });
    });
    return idx;
  }
  function initSearch() {
    var dlg = $('#search'); if (!dlg) return;
    var input = $('#searchInput'), list = $('#searchResults'), cats = $('.search__cats', dlg);
    var idx = null, cat = 'all', lastFocus = null;
    var norm = function (s) { return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); };
    var hl = function (text, q) {
      if (!q) return esc(text);
      var i = norm(text).indexOf(q); if (i < 0) return esc(text);
      return esc(text.slice(0, i)) + '<mark>' + esc(text.slice(i, i + q.length)) + '</mark>' + esc(text.slice(i + q.length));
    };
    var run = function () {
      idx = idx || buildIndex();
      var q = norm(input.value.trim());
      var score = function (r) { return !q ? 0 : norm(r.t).indexOf(q) > -1 ? 3 : norm(r.d).indexOf(q) > -1 ? 2 : norm(r.k).indexOf(q) > -1 ? 1 : 0; };
      var res = idx.map(function (r) { return { r: r, s: score(r) }; })
        .filter(function (x) { return (cat === 'all' || x.r.cat === cat) && (!q || x.s > 0); })
        .sort(function (a, b) { return b.s - a.s; }).slice(0, 12).map(function (x) { return x.r; });
      list.innerHTML = res.length ? res.map(function (r) {
        return '<li><a href="' + r.u + '"><span class="r-cat">' + esc(r.cat.toUpperCase()) + '</span><span class="r-t">' + hl(r.t, q) + '</span><span class="r-d">' + hl(r.d, q) + '</span></a></li>';
      }).join('') : '<li class="r-empty">Sin resultados. Prueba con «drones», «agua» o «Jalisco».</li>';
    };
    var open = function () {
      lastFocus = document.activeElement; dlg.hidden = false; document.body.style.overflow = 'hidden';
      run(); setTimeout(function () { input.focus(); }, 30);
    };
    var close = function () { dlg.hidden = true; document.body.style.overflow = ''; if (lastFocus) lastFocus.focus(); };
    $$('[data-open-search]').forEach(function (b) { b.addEventListener('click', open); });
    $$('[data-close-search]', dlg).forEach(function (b) { b.addEventListener('click', close); });
    input.addEventListener('input', run);
    cats.addEventListener('click', function (e) {
      var b = e.target.closest('[data-cat]'); if (!b) return; cat = b.dataset.cat;
      $$('.chip', cats).forEach(function (c) { var on = c === b; c.classList.toggle('is-on', on); c.setAttribute('aria-pressed', String(on)); });
      run(); input.focus();
    });
    list.addEventListener('click', function (e) { if (e.target.closest('a')) close(); });
    document.addEventListener('keydown', function (e) {
      if (!dlg.hidden) {
        if (e.key === 'Escape') { e.preventDefault(); close(); }
        if (e.key === 'Tab') { // focus trap
          var f = $$('input, button, a[href]', dlg).filter(function (x) { return x.offsetParent !== null; });
          if (!f.length) return;
          if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
          else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
        }
      } else if ((e.key === '/' || (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey))) && !/input|textarea/i.test(document.activeElement.tagName)) {
        e.preventDefault(); open();
      }
    });
  }

  /* ---------------- Newsletter ----------------
     TODO: conectar proveedor de newsletter. Hoy NO se envía ni se guarda
     ningún correo: solo se valida en el navegador y se informa al usuario. */
  function initNewsletter() {
    var form = $('#nlForm'); if (!form) return;
    var input = $('#nlEmail'), msg = $('#nlMsg');
    var re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    input.addEventListener('input', function () { form.classList.remove('is-error'); input.removeAttribute('aria-invalid'); msg.textContent = ''; msg.className = 'nl__msg'; });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = input.value.trim();
      if (!re.test(v)) {
        form.classList.remove('is-error'); void form.offsetWidth; form.classList.add('is-error');
        input.setAttribute('aria-invalid', 'true');
        msg.className = 'nl__msg err';
        msg.textContent = v ? 'Revisa tu correo: parece que falta algo (ej. nombre@dominio.com).' : 'Escribe tu correo para continuar.';
        input.focus(); return;
      }
      msg.className = 'nl__msg ok';
      msg.innerHTML = '¡Gracias! Field Notes arranca pronto. <strong>Todavía no enviamos correos ni guardamos tu dirección</strong>: mientras activamos el registro, síguenos en <a href="https://www.instagram.com/agrovision_mx/" target="_blank" rel="noopener" style="text-decoration:underline">@agrovision_mx</a>.';
      form.reset();
    });
  }

  /* ---------------- Back to top + misc ---------------- */
  function initMisc() {
    var btn = $('#toTop');
    if (btn) {
      window.addEventListener('scroll', function () { btn.classList.toggle('show', window.scrollY > window.innerHeight * 0.9); }, { passive: true });
      btn.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); var n = $('.brand'); if (n) n.focus({ preventScroll: true }); });
    }
    var y = $('#year'); if (y) y.textContent = new Date().getFullYear();
    var fl = $('.flow'); if (fl) fl.setAttribute('data-inview', '');
  }

  /* ---------------- Boot ---------------- */
  function boot() {
    initTheme(); initNav(); initMisc();
    renderData(); initMap(); initFacts(); initArticles();
    initHero(); initSearch(); initNewsletter();
    observeReveal(document);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
