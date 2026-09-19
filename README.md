# AGROVISION_MX

**Del campo al dato.** · AGRO + TECH + NEGOCIO + MÉXICO

AGROVISION_MX es un medio digital que explica cómo la tecnología está transformando el campo mexicano. Este repositorio contiene su sitio web, publicado en GitHub Pages:

👉 https://groupmaglobal-bot.github.io/agrovision-mx/

---

## Stack

| Pieza | Elección | Por qué |
|---|---|---|
| Sitio | HTML + CSS + JavaScript vanilla | Carga rápido, no depende de frameworks y GitHub Pages lo sirve tal cual |
| Contenido | `assets/js/data.js` (fuente única) | Artículos, datos, estados y fuentes en un solo lugar |
| Build | `scripts/build.mjs` (Node, sin dependencias) | Genera las páginas de artículos, el sitemap y valida fuentes y enlaces |
| Tests | Playwright (`tests/smoke.spec.js`) | 21 smoke tests: navegación, menú móvil, filtros, buscador, tema, newsletter, responsive y consola |
| Animación | CSS + IntersectionObserver | Principios de Emil Kowalski: ease-out fuerte, press `scale(.97)`, solo `transform`/`opacity`, `prefers-reduced-motion` |
| Fotos | Unsplash (Unsplash License), servidas desde su CDN oficial | Con créditos en el sitio |
| Tipografía | Inter (800/700/600/400-500) + JetBrains Mono para etiquetas de datos | |

## Ejecutar localmente (Windows / macOS / Linux)

Requisito: [Node.js 20+](https://nodejs.org).

```powershell
git clone https://github.com/groupmaglobal-bot/agrovision-mx.git
cd agrovision-mx
npm install
npm run build
npm run serve
```

Abre **http://localhost:4173/agrovision-mx/**. El servidor local imita la subruta de GitHub Pages, así que si algo funciona aquí, también funcionará publicado.

> También puedes abrir `index.html` con doble clic. El home funciona, pero conviene `npm run serve` para probar todo como en producción.

## Build y tests

```powershell
npm run build      # valida data.js, genera /articles, sitemap.xml y robots.txt, y revisa enlaces internos
npx playwright install chromium   # solo la primera vez
npm test           # smoke tests con Playwright
npm run check      # build + tests
```

El build **falla** si un artículo o dato cita una fuente inexistente, si una fuente no usa `https`, o si hay un enlace interno o ancla rota.

## Desplegar

GitHub Pages publica la rama `main` desde la raíz (`/`). No hay paso de compilación en el servidor:

1. `npm run build` (los archivos de `/articles` generados **se suben** al repo).
2. `git add . && git commit -m "..." && git push`.
3. En 1–2 minutos se actualiza https://groupmaglobal-bot.github.io/agrovision-mx/

Todas las rutas son **relativas**, así que el sitio funciona bajo la subruta `/agrovision-mx/`. `.nojekyll` evita el procesamiento de Jekyll.

## Estructura

```
/
├── index.html              # Landing: Hero → Cambio → AgroTech → Negocio → Datos → México
│                           #          → ¿Sabías que? → Actualidad → Instagram → Newsletter → Comunidad → Sobre
├── articles/               # GENERADO por el build (no editar a mano)
│   ├── index.html          # Listado con filtros
│   └── <slug>.html         # Un archivo por artículo (SEO + Schema.org Article)
├── assets/
│   ├── css/styles.css      # Tokens de marca, componentes, responsive, dark mode
│   ├── js/data.js          # ⭐ CONTENIDO: artículos, datos, estados, facts y FUENTES
│   ├── js/app.js           # Componentes: Navbar, Hero/HUD, DataCards, MexicoMap, ArticleGrid, Search, Newsletter…
│   └── img/                # Logo, favicon, imagen OG
├── scripts/build.mjs       # Build estático + validaciones
├── scripts/serve.mjs       # Servidor local con la subruta de Pages
├── tests/smoke.spec.js     # Tests Playwright
├── sitemap.xml · robots.txt · .nojekyll
```

## Agregar un artículo

1. Abre `assets/js/data.js` y copia un objeto del arreglo `articles`.
2. Cambia `id` (slug en minúsculas con guiones), `title`, `subtitle`, `category` (`AGRO`, `AGROTECH`, `INNOVACIÓN`, `NEGOCIO` o `MÉXICO`), `date` (`AAAA-MM-DD`), `excerpt`, `photo` y `body`.
   - En `body`, cada elemento es un párrafo. `## Título` crea un subtítulo y `> texto` crea una cita.
3. En `sources`, lista los ids de fuentes que respaldan el artículo.
4. Ejecuta `npm run build`. El artículo aparece en el home, en `/articles/`, en el buscador y en el sitemap.

## Agregar una fuente

En `SOURCES` (dentro de `data.js`):

```js
miFuente: { name: 'SIAP', year: '2026', url: 'https://…' },
```

**Regla editorial:** ninguna cifra sin fuente. Si un dato no se puede verificar en una fuente oficial o primaria, no se publica. Para un estado sin dato verificado, el mapa muestra «Próximamente».

## Cambiar colores

Todos los tokens están al inicio de `assets/css/styles.css`:

```css
--green:#16A34A; --green-2:#22C55E; --lime:#84CC16; --carbon:#0B141B;
--forest:#10251D; --paper:#F7F8F5; --blue:#2563EB; --yellow:#FACC15;
```

El modo oscuro redefine las variables en `[data-theme="dark"]`. La preferencia del usuario se guarda en `localStorage` (`agv-theme`).

## Cambiar contenido

- **Textos de secciones:** directo en `index.html` (cada sección está comentada).
- **Datos, estados, «¿Sabías que?», artículos y fotos:** `assets/js/data.js`.
- **Fotos:** en `PHOTOS`, cambia `id` por otra foto de Unsplash o por una ruta local (`assets/img/fotos/…`) y actualiza `credit` y `page`. La foto del hero también se referencia en `index.html` (`<link rel="preload">` e `<img>`).
- **Logo:** `assets/img/logo-96.webp` (navbar), `logo-320.webp` (sección Sobre), `favicon-64.png`, `apple-touch-icon.png` y `og-image.jpg` (redes sociales).

## Pendientes conocidos

- **Newsletter:** el formulario valida el correo, pero **todavía no envía ni guarda nada**. Busca `TODO: conectar proveedor de newsletter` en `index.html` y `app.js` (Beehiiv, MailerLite o Buttondown).
- **LinkedIn / YouTube:** desactivados en el footer hasta que existan las cuentas.
- **Querétaro:** aparece como «Próximamente» en el mapa hasta tener un dato con fuente oficial.
