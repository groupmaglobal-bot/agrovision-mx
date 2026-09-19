# AGROVISION INTELLIGENCE

**El motor editorial de AGROVISION_MX.** Busca, filtra, verifica, clasifica y transforma información de AGRO + TECH + NEGOCIO + MÉXICO en borradores de contenido con fuentes.

> Principio: **AGROVISION_MX no publica por publicar.** El motor nunca inventa cifras ni publica solo. Lo que no se puede verificar queda marcado como **NO VERIFICADO**.

- Dashboard: `https://groupmaglobal-bot.github.io/agrovision-mx/intel/` (con `noindex` y fuera del menú del sitio).
- Base: `intel/data/db.json`
- Borradores: `intel/output/<fecha>/`

---

## 1. Arquitectura

```
                 ┌───────────────────── intel/config ─────────────────────┐
                 │ taxonomy.json · sources.json (tiers + feeds) · trends.json │
                 └──────────────────────────────┬─────────────────────────┘
  CONECTORES (Node)                             │           CORE (Node + navegador)
  lib/connectors/rss.js        ─┐               ▼           lib/core.js
  lib/connectors/googlenews.js ─┼─► searchSources() ─► createItem → classifyArticle
  lib/connectors/article.js    ─┤   fetchArticle()        → dedupe → verifyArticle
  lib/connectors/manual.js     ─┘   extractContent()      → scoreArticle → detectTrends
                                                          → generateContent / buildSEO / buildWeekly
                          lib/pipeline.js (orquesta y persiste)  ─►  data/db.json
                          cli.js (daily · trends · summary · weekly · search · import …)
                          .github/workflows/intel.yml (06:00 · 12:00 · 18:00 · domingo)
                          index.html + app.js (dashboard, lee db.json y usa el mismo core)
```

| Capa | Archivo | Responsabilidad |
|---|---|---|
| Configuración | `config/taxonomy.json` | Categorías, subcategorías y palabras clave (ES/EN), términos de bonificación y patrones de clickbait |
| | `config/sources.json` | Registro de dominios con tier y tipo (primaria o secundaria) y lista de feeds |
| | `config/trends.json` | Temas vigilados para el TREND SCORE |
| Core | `lib/core.js` | Funciones puras compartidas por la CLI y el dashboard |
| Conectores | `lib/connectors/*` | Red: RSS/Atom, Google News, página de artículo e importación JSON |
| Orquestación | `lib/pipeline.js` | Ingesta, recálculo, colecciones derivadas, generación a archivos e informes |
| CLI | `cli.js` | Comandos (ver §3) |
| Dashboard | `index.html`, `app.js`, `intel.css` | Buscar, filtrar, guardar, analizar, ver tendencias, generar y exportar |
| BD | `data/db.json`, `schema.sql` | JSON hoy; el esquema PostgreSQL/Supabase queda listo para migrar |

Sin dependencias nuevas: Node 20+ (`fetch` nativo) y JavaScript vanilla, igual que el resto del sitio.

---

## 2. Cómo decide el motor

### Clasificación
Compara el texto normalizado (sin acentos, con límites de palabra) contra `taxonomy.json`. Si el ítem ya trae una categoría del analista, esa se respeta. Si no:
- Cuando hay tecnología clara aplicada al agro, la categoría es **TECH**.
- Es **MÉXICO** sólo si la nota trata de un estado y no tiene un eje temático fuerte.

### Puntuación interna (0-100, **nunca pública**)
| Componente | Peso |
|---|---|
| Relación con Agro | 25% |
| Tecnología | 20% |
| Impacto empresarial | 20% |
| Relevancia para México | 15% |
| Actualidad (≤7 días = 10) | 10% |
| Calidad de la fuente (tier 1 = 10, 2 = 7, 3 = 4, desconocida = 2) | 10% |

**Bonificadores** (+10 cada uno): datos nuevos, innovación concreta, impacto económico, afecta a productores, aplicación práctica, agro + tech.
**Penalizaciones:** duplicado −30, fuente poco confiable −30, sin evidencia −40, clickbait −50, información falsa −100 (el score queda en 0).
`score` se limita a 0-100 según la especificación. `priority`, el mismo cálculo sin tope, sólo sirve para ordenar.

### Verificación y evidencia
| Nivel | Regla |
|---|---|
| **ALTO** | Fuente primaria (tier 1) con URL abierta, o al menos una corroboración seria (tier ≤ 2) |
| **MEDIO** | Fuente tier 2, o una sola corroboración de cualquier nivel |
| **BAJO** → **NO VERIFICADO** | Fuente débil sin corroborar, o URL sin abrir y sin corroboración |

- **Nunca se sube por encima de la calificación del analista**: si el analista dijo MEDIO, se queda en MEDIO.
- **Las contradicciones se muestran**: "Las fuentes consultadas difieren: …". No se ocultan.
- **Si la fuente es una empresa y nadie más lo confirma**, se presenta como "según la empresa".

### Duplicados y "misma historia"
- **Duplicado** (se penaliza): misma URL canónica, títulos casi idénticos, o misma historia con 2 o más cifras idénticas. El duplicado se convierte en corroboración del original.
- **Relacionado**: similitud parcial en el mismo territorio. Sirve para corroborar y para revisar a mano.

### Publicable
Un ítem es publicable si cumple todo esto:
- no es duplicado;
- su evidencia no es BAJA;
- su análisis está completo (resumen, por qué importa, qué cambió, dato, impactos y oportunidad);
- su puntuación es de 55 o más.

### Tendencias (TREND SCORE interno)
Se calcula así: `40 × volumen + 30 × diversidad de tipos de fuente + 20 × crecimiento (30 días vs. los 90 anteriores) + 10 × fuentes primarias`.
Con pocas semanas de datos es una **señal preliminar**.

### Generador de contenido
Sólo **recombina** campos que ya existen en el ítem. Si falta algo, escribe `[PENDIENTE: …]`. Si el ítem no es publicable, el texto empieza con **⚠️ NO VERIFICADO / NO PUBLICAR TODAVÍA**. Una prueba automática revisa que ninguna cifra generada salga de fuera del ítem.
Formatos: newsletter, carrusel de Instagram (9 slides), reel (con tiempos, texto en pantalla, voz y B-roll), artículo web (SEO + FAQ + Schema.org), LinkedIn e historias. También sugiere formatos especiales ("El dato de la semana", "AgroTech de la semana", "¿Cuánto cuesta?"…) e ideas de entrevista.

---

## 3. Uso diario (Windows, PowerShell)

```powershell
cd agrovision-mx
npm install                                  # una vez
npm run intel -- daily --fetch               # 06:00 · busca en los feeds y verifica cada URL
npm run intel -- trends                      # 12:00 · recalcula tendencias
npm run intel -- summary                     # 18:00 · intel/output/<fecha>/resumen-diario.md
npm run intel -- weekly                      # domingo · AGROVISION WEEKLY #NNN
npm run intel -- search "drones Sinaloa" --fetch   # búsqueda ad hoc (Google News ES + EN)
npm run intel -- top 15                      # ítems listos con más potencial
npm run intel -- generate agv-3ed53b42       # newsletter/instagram/linkedin/article/reel .md
npm run intel -- export csv                  # también json | md
npm run intel -- sources:check               # prueba cada feed configurado
npm run intel -- rebuild                     # reconstruye data/db.json desde intel/inbox/*.json
npm run serve                                # dashboard: http://localhost:4173/agrovision-mx/intel/
```

**Flujo editorial recomendado:**
1. Abre el dashboard y revisa las tendencias.
2. Filtra por "Listo para contenido".
3. Usa **Analizar** para ver las 11 preguntas y la verificación.
4. Genera el formato que necesites.
5. Revisa, diseña (Canva) y publica **tú**.

### Programación
- **GitHub Actions** (`.github/workflows/intel.yml`): corre a las 06:00, 12:00 y 18:00 hora de CDMX, y el domingo genera el Weekly. Hace commit de `intel/data` e `intel/output`, y el dashboard se actualiza con GitHub Pages. También se puede lanzar a mano desde *Actions → Intel · motor editorial → Run workflow* (con `search` y un tema). Cada push que toque `intel/inbox`, `intel/config` o `intel/lib` ejecuta `rebuild` y regenera `intel/data/db.json`.
- **Alternativa local (Programador de tareas de Windows):**
  ```powershell
  schtasks /Create /TN "AGV Intel 06" /SC DAILY /ST 06:00 /TR "cmd /c cd /d C:\ruta\agrovision-mx && npm run intel -- daily --fetch"
  schtasks /Create /TN "AGV Intel 12" /SC DAILY /ST 12:00 /TR "cmd /c cd /d C:\ruta\agrovision-mx && npm run intel -- trends"
  schtasks /Create /TN "AGV Intel 18" /SC DAILY /ST 18:00 /TR "cmd /c cd /d C:\ruta\agrovision-mx && npm run intel -- summary"
  schtasks /Create /TN "AGV Weekly"   /SC WEEKLY /D SUN /ST 18:30 /TR "cmd /c cd /d C:\ruta\agrovision-mx && npm run intel -- weekly"
  ```

---

## 4. Importar investigación (Claude, manual u otra herramienta)

Guarda un arreglo JSON en `intel/inbox/AAAA-MM-DD-tema.json` y ejecuta:
```powershell
npm run intel -- import intel/inbox/2026-09-19-agro.json
```
Campos por ítem: `title_original`, `url` (obligatorios), `title_agrovision`, `published_at`, `country`, `mx_state`, `category`, `subcategory`, `technologies[]`, `companies[]`, `summary`, `what_changed`, `key_fact`, `why_matters`, `impact_producers`, `impact_business`, `impact_mexico`, `business_opportunity`, `problem`, `solution_tech`, `who`, `small_producer_access`, `investment`, `regulation`, `metrics[]`, `corroborating_sources[]`, `contradictions`, `verification_notes`, `evidence`, `verified_by_fetch`.

Formato de cada métrica (el valor siempre es un número):
```json
{ "metric": "Producción de maíz", "value": 24.3, "unit": "millones de toneladas", "period": "2026/27 (proyección)", "region": "México", "source": "USDA", "url": "https://…", "retrieved_at": "2026-09-19", "methodology": null }
```
La importación es idempotente: el mismo URL actualiza el ítem en lugar de duplicarlo.

---

## 5. Ampliar el sistema

| Quiero… | Haz esto |
|---|---|
| Nueva fuente confiable | Agrega el dominio a `config/sources.json → domains` con `tier`, `type` y `kind` |
| Nuevo feed RSS | Agrega `{ "id", "type": "rss", "url" }` a `feeds` y ejecuta `sources:check` |
| Nueva búsqueda fija | Agrega `{ "type": "googlenews", "query", "lang", "country" }` a `feeds` |
| Nuevo tema de tendencia | Agrega un objeto a `config/trends.json → topics` |
| Nueva subcategoría o palabra clave | Edita `config/taxonomy.json` |
| Nuevo conector (API FAO, SIAP, INEGI…) | Crea `lib/connectors/<nombre>.js` que devuelva `[{ title, url, description, published_at, source_name, source_url }]` y regístralo en `searchSources()` de `lib/pipeline.js` |
| Nuevo formato de contenido | Agrega un `case` en `generateContent()` (`lib/core.js`) usando sólo campos del ítem y súmalo a `CONTENT_TYPES` |
| Enriquecer con IA (LLM) | Opcional. Agrega un paso después de `ingestRaw` que proponga `summary`, `why_matters` y los demás campos **sólo a partir del texto extraído**, con `evidence` como máximo MEDIO hasta la revisión humana |
| Migrar a base de datos | Crea las tablas con `schema.sql` (Supabase o Postgres), exporta con `export json` y carga con un script. El dashboard sólo necesita un endpoint que devuelva el mismo JSON |

---

## 6. Pruebas

```powershell
npm run intel:test     # 21 pruebas unitarias del motor (sin red)
npm test               # Playwright: 21 smoke del sitio + 7 del dashboard
npm run check          # build + intel:test + Playwright
```

---

## 7. Riesgos y buenas prácticas

- **El dashboard es público pero no está indexado.** Contiene sólo información pública, pero muestra la puntuación interna. Si quieres ocultarlo del todo, muévelo a un repositorio privado o protégelo con Cloudflare Access.
- **Google News redirige.** Con `--fetch`, el motor sigue la redirección para verificar la URL final. Sin `--fetch`, los ítems quedan sin verificar y no son publicables.
- **Los sitios gob.mx a veces responden 403** a los bots. En ese caso, corrobora con una segunda fuente y anótalo en `verification_notes`.
- **Los ítems que llegan por RSS no traen análisis.** El motor los clasifica y los puntúa, pero no son publicables hasta que alguien (tú o Claude) complete el análisis. Es intencional.
- **Las tendencias necesitan volumen.** No las presentes como "tendencia" pública sin varias semanas de datos.
- **Cifras que parecen contradecirse.** Antes de publicar, revisa qué mide cada una (volumen o valor), su periodo y su moneda.
