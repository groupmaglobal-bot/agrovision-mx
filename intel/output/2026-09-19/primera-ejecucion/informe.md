# AGROVISION INTELLIGENCE — Primera ejecución

**Fecha:** 19 de septiembre de 2026 · **Motor:** v1.0.0 · **Regla:** sólo información verificable, cada pieza con su fuente.

## 1. Cómo se hizo la búsqueda

| Paso | Qué pasó |
|---|---|
| Búsqueda | Cuatro frentes en paralelo (Agro, AgroTech, Business y México), priorizando FAO, SADER, INEGI, IICA, CIMMYT, CEPAL, Banco Mundial y comunicados corporativos. Después, medios serios y especializados. |
| Verificación de URL | Se abrió la URL principal de cada ítem con éxito. Cuando la fuente oficial respondió 403 (algunas de gob.mx), el ítem se sostuvo con una segunda fuente y quedó registrado en `verification_notes`. Si no hubo segunda fuente, como en la regulación de drones de AFAC, el ítem quedó NO VERIFICADO. |
| Ingesta | Los cuatro lotes entraron con el conector de importación (`intel/inbox/2026-09-19-*.json`). En este entorno de nube la salida a los feeds RSS está bloqueada; las corridas programadas en GitHub Actions sí los leen. |
| Motor | Clasificación, puntuación interna, verificación, duplicados (misma URL o misma historia), tendencias y generación de borradores. |

## 2. Resultados

| Indicador | Valor |
|---|---|
| Ítems únicos en la base | 53 (54 ingresados, 1 duplicado) |
| Por categoría | Agro 10 · AgroTech 14 · Business 13 · México 16 |
| Entidades federativas con al menos un ítem | 13 (incluye CDMX y Estado de México), más Nacional |
| Listos para contenido | 50 |
| **NO VERIFICADOS** (no publicar) | 3: el blog de un fabricante sobre la regulación de drones en México, la nota de AgNavigator sobre la IA en Brasil y el anuncio de GEODASH sobre drones sin mapeo. Los tres tienen una sola fuente débil. |
| Duplicado detectado | Maíz/USDA: Punto por Punto y El Economista publicaron la misma proyección. Se conservó una y la otra quedó como corroboración. |
| Contradicciones expuestas | 25 ítems con la nota "Las fuentes consultadas difieren…". Ejemplos: la duración del cierre ganadero (14, 18 o 21 meses), el aguacate (+35% en volumen frente a -25% en valor), el PIB agrícola (7.1% según SADER frente a 4.8% en actividades primarias según INEGI) y el alza de los fertilizantes según la fuente. |
| Datos estructurados (métricas) | 153, cada una con valor, unidad, periodo, territorio, fuente y URL |

**Top 3 de tendencias.** Es una señal preliminar: la muestra es de 53 ítems y la tendencia necesita varias semanas de corridas para ser robusta.

1. **Agricultura digital y datos.** Aparece en 15 ítems de 6 tipos de fuente (organismos, empresas, centros de investigación, consultoras, medios y medios especializados).
2. **Maíz y granos.** Coinciden la proyección de importaciones récord, el precio objetivo en Sinaloa, la semilla CIMMYT y la cosecha récord de Brasil.
3. **Riego y agua.** El norte llega seco y el centro llega lleno: la sequía cubre 8.9% del país, las presas de Chihuahua están al 24.97% y el Cutzamala al 82.7%.

## 3. Selección editorial (mayor potencial)

Criterio: la puntuación interna más el principio editorial. Cada tema debía responder qué cambia, qué tecnología está en juego, quién está detrás, cuánto importa y qué significa para México.

| Tema | Por qué | Formatos |
|---|---|---|
| IA generativa en el campo: 17% la usa y 4% paga (McKinsey) | Es el dato AgroTech más nuevo (8 de septiembre) y abre una tesis de negocio | IG, Reel, Artículo |
| Gusano barrenador y reapertura ganadera | Es la historia del mes para el norte, con impacto directo en productores | IG, Reel, Artículo, Weekly |
| Fertilizantes caros y el maíz | Explica el costo de producir y por qué se siembra menos | IG, Artículo, Newsletter |
| Drones como servicio público en la CDMX | Es un caso mexicano concreto y aplicable a pequeños productores | IG, Reel |
| Aguacate: volumen +35% y valor -25% | Muestra cómo leer datos que parecen contradecirse | IG |
| El mapa del agua | Pone lado a lado la sequía, las presas de Chihuahua y el Cutzamala | Newsletter |
| Capital AgTech selectivo y consolidación | Aporta el ángulo de inversión | Newsletter, LinkedIn |
| Deere y el "fondo del ciclo" | Es el termómetro de la maquinaria agrícola | LinkedIn |
| El superávit agroalimentario cae y el T-MEC sigue en revisión | Tiene el mayor impacto empresarial para México | LinkedIn |

## 4. Entregables de esta ejecución

- `instagram.md`: 5 carruseles de 9 slides.
- `newsletter.md`: 3 ideas de newsletter con estructura y datos.
- `articulos/`: 3 artículos web con SEO, FAQ y Schema.org.
- `reels.md`: 3 guiones con texto en pantalla, voz en off y B-roll.
- `linkedin.md`: 3 posts.
- `agrovision-weekly-001.md`: el Weekly #001.
- Borradores automáticos del motor: se generan desde el dashboard (botones Instagram, Newsletter, Reel, Artículo y LinkedIn) o con `npm run intel -- generate <id>`.

> **Nada de esto se publica solo.** Todo queda como borrador para que lo revises y lo apruebes.

## 5. Los 53 temas encontrados

### Agro (10)

| # | Tema (título AGROVISION) | Fuente | Fecha | Evidencia | Estado |
|---|---|---|---|---|---|
| 1 | Semillas mexicanas con germoplasma del CIMMYT: una alianza para competir con las transnacionales | [CIMMYT](https://www.cimmyt.org/es/noticias/cimmyt-y-empresas-semilleras-impulsan-una-agenda-para-fortalecer-la-competitividad-del-campo-mexicano/) | 2026-07-22 | ALTO | Listo |
| 2 | Gusano barrenador: 1,880 casos activos en México y la plaga ya llega a Sonora | [Proyecto Puente (con datos de SENASICA)](https://proyectopuente.com.mx/2026/09/17/sonora-acumula-77-casos-de-gusano-barrenador-en-menos-de-un-mes-59-estan-activos-la-mayoria-en-alamos-y-huatabampo) | 2026-09-17 | ALTO | Listo |
| 3 | Fertilizantes más caros: el choque de Ormuz eleva los costos del campo mexicano | [El Imparcial (con datos de GCMA)](https://www.elimparcial.com/mexico/2026/04/02/precios-de-fertilizantes-aumentan-hasta-572-y-encarecen-la-produccion-agricola-advierten-impacto-en-alimentos-y-tortilla/) | 2026-04-01 | MEDIO | Listo |
| 4 | América Latina produce más, pero no más eficiente: el reto de productividad agrícola según IICA, CEPAL, FAO y CAF | [CEPAL (informe conjunto con IICA, FAO y CAF)](https://www.cepal.org/es/comunicados/elevar-la-productividad-esencial-construir-sistemas-agroalimentarios-mas-resilientes) | 2026-06-02 | ALTO | Listo |
| 5 | FAO Food Outlook 2026: producción sólida, pero con riesgos geopolíticos y climáticos al alza | [FAO](https://www.fao.org/newsroom/detail/fao-food-outlook--global-food-commodity-market-trends-face-rising-geopolitical-and-weather-risks/en) | 2026-06-18 | ALTO | Listo |
| 6 | Brasil confirma cosecha récord de granos: 361.7 millones de toneladas en 2025/26 | [Agência Gov (Gobierno de Brasil) / Conab](https://agenciagov.ebc.com.br/noticias/202609/conab-estima-producao-de-361-7-milhoes-de-toneladas-de-graos-na-safra-2025-26) | 2026-09-15 | ALTO | Listo |
| 7 | La sequía vuelve a crecer en México: 8.9% del territorio al cierre de agosto de 2026 | [El Cronista (con datos del Monitor de Sequía de México, SMN-CONAGUA)](https://www.cronista.com/mexico/actualidad-mx/sequia-avanza-en-chihuahua-oaxaca-y-tamaulipas-asi-mide-el-fenomeno-el-monitor-de-sequia-de-mexico/) | 2026-09-17 | MEDIO | Listo |
| 8 | Chihuahua, con presas al 25%: el norte agrícola llega al otoño con poca agua | [ZOLO Noticias (con datos de CONAGUA)](https://www.zolonoticias.com/2026/09/16/presas-de-chihuahua-presentan-caida-de-700-millones-de-m%C2%B3-en-un-ano/) | 2026-09-16 | MEDIO | Listo |
| 9 | El Cutzamala en su mejor nivel en años: contraste hídrico entre el centro y el norte de México | [Excélsior (con datos de CONAGUA)](https://www.excelsior.com.mx/nacional/sistema-cutzamala-mejor-nivel-9-anos-septiembre) | 2026-09-08 | MEDIO | Listo |
| 10 | El campo impulsa la economía: el sector primario crece 7.3% anual en el segundo trimestre de 2026 | [Imagen Agropecuaria (con datos de SADER e INEGI)](https://imagenagropecuaria.com/2026/sector-primario-crece-3-3-en-segundo-trimestre-de-2026-sader/) | 2026-07-31 | ALTO | Listo |

### AgroTech (14)

| # | Tema (título AGROVISION) | Fuente | Fecha | Evidencia | Estado |
|---|---|---|---|---|---|
| 1 | Una startup mexicana entre las 15 AgTech elegidas por el IICA para la Semana de la Agricultura Digital | [IICA](https://iica.int/es/prensa/noticias/el-iica-y-jurado-especializado-seleccionan-las-15-startups-agtech-que-participaran-en-la-quinta-edicion-de-la-semana-de-la-agricultura-digital) | 2026-08-11 | ALTO | Listo |
| 2 | Drones en el suelo de conservación de la CDMX: 90% menos agua para combatir plagas | [La Jornada](https://www.jornada.com.mx/2026/01/12/capital/027n1cap) | 2026-01-12 | MEDIO | Listo |
| 3 | Qué exige la regulación mexicana para volar drones agrícolas | [EAVision (blog corporativo)](https://www.eavision.com/about/news/agricultural-drones-in-mexico-market-entry-regulations-and-dealer-opportunity) | 2026-05-07 | BAJO | NO VERIFICADO |
| 4 | Brasil apuesta por la IA para su siguiente etapa agrícola: 35% de sus AgTech ya la tiene como núcleo | [AgNavigator](https://www.agnavigator.com/Article/2026/06/03/brazils-ag-sector-turns-to-ai-to-solve-geopolitical-logistic-challenges/) | 2026-06-03 | BAJO | NO VERIFICADO |
| 5 | CIMMYT usa IA para anticipar plagas y micotoxinas en el maíz de México y Centroamérica | [CIMMYT](https://www.cimmyt.org/es/noticias/anticipar-para-proteger-la-ciencia-de-cimmyt-fortalece-la-sanidad-la-inocuidad-y-la-seguridad-alimentaria/) | 2026-07-22 | ALTO | Listo |
| 6 | Drones de aspersión sin mapeo previo: nueva empresa apunta a caña, soya y maíz en América | [RoboticsTomorrow (comunicado de empresa)](https://www.roboticstomorrow.com/news/2026/04/15/dronedash-and-geodnet-launch-geodash-aerosystems-to-bring-map-free-ai-driven-precision-spraying-to-industrial-agriculture/26422/) | 2026-04-15 | BAJO | NO VERIFICADO |
| 7 | La IA generativa ya llegó al campo: 17% de los agricultores la usa, pero casi nadie paga por ella | [McKinsey & Company](https://www.mckinsey.com/industries/agriculture/our-insights/global-farmer-insights) | 2026-09-08 | ALTO | Listo |
| 8 | Drones, sensores e IA en el borde: un modelo para detectar enfermedades de cultivos antes de que se vean | [Scientific Reports (Nature Portfolio)](https://www.nature.com/articles/s41598-025-32384-1) | 2025-12-17 | ALTO | Listo |
| 9 | La robótica agrícola ya suma más de 400 empresas en el mundo, pero escalar sigue siendo el reto | [Wine Industry Advisor (comunicado de The Mixing Bowl y California AgTech Alliance)](https://wineindustryadvisor.com/2026/09/17/2026-crop-robotics-landscape-maps-more-than-400-companies-worldwide/) | 2026-09-17 | MEDIO | Listo |
| 10 | Microsoft y Land O'Lakes crean "Oz", un copiloto de IA entrenado con 20 años de datos agronómicos | [Microsoft Source](https://news.microsoft.com/source/2025/11/12/land-olakes-and-microsoft-partner-to-accelerate-ai-innovation-in-agriculture/) | 2025-11-12 | ALTO | Listo |
| 11 | NVIDIA equipa a la Universidad de Hawái para entrenar robots agrícolas que ven, entienden y actúan | [University of Hawaiʻi System News](https://www.hawaii.edu/news/2026/01/14/nvidia-awards-next-gen-tech/) | 2026-01-14 | ALTO | Listo |
| 12 | Edición genética de cultivos: Argentina agiliza aprobaciones y la UE separa las nuevas técnicas de los transgénicos | [Morrison Foerster](https://www.mofo.com/resources/insights/260716-plant-gene-editing-regulation-roundup) | 2026-07-17 | MEDIO | Listo |
| 13 | John Deere lleva a CES 2026 una cosechadora casi autónoma con IA y conexión satelital | [DTN / Progressive Farmer](https://www.dtnpf.com/agriculture/web/ag/equipment/article/2026/01/07/deere-displays-technology-loaded-x9) | 2026-01-09 | MEDIO | Listo |
| 14 | La inversión en AgriFoodTech se estanca en 16.2 mil millones de dólares, pero el dinero se mueve hacia el campo | [AgFunderNews](https://agfundernews.com/agrifoodtech-funding-is-flat-the-interesting-part-is-where-it-isnt) | 2026-03-18 | MEDIO | Listo |

### Business (13)

| # | Tema (título AGROVISION) | Fuente | Fecha | Evidencia | Estado |
|---|---|---|---|---|---|
| 1 | Deere sube utilidades, pero la gran agricultura sigue en fondo de ciclo | [Deere & Company (PR Newswire)](https://www.prnewswire.com/news-releases/deere-reports-third-quarter-net-income-of-1-379-billion-302856316.html) | 2026-08-20 | ALTO | Listo |
| 2 | Fertilizantes se disparan: la urea sube 80% por la crisis de Ormuz | [Banco Mundial](https://blogs.worldbank.org/en/opendata/fertilizer-prices-surge-as-strait-of-hormuz-disruptions-tighten-) | 2026-05-14 | ALTO | Listo |
| 3 | México exporta más, pero su superávit agroalimentario se reduce | [La Jornada (con datos de Banxico y GCMA)](https://www.jornada.com.mx/2026/07/18/economia/014n2eco) | 2026-07-18 | MEDIO | Listo |
| 4 | Reabre la exportación de ganado mexicano a EE.UU. tras el gusano barrenador | [Infobae](https://www.infobae.com/mexico/2026/09/18/mexico-exportara-hasta-mil-500-cabezas-de-ganado-diarias-a-eeuu-a-partir-de-octubre/) | 2026-09-18 | ALTO | Listo |
| 5 | Aguacate mexicano: exportaciones a EE.UU. crecen 35% en el primer cuatrimestre | [Portalfrutícola (con datos de SE y SADER)](https://www.portalfruticola.com/noticias/2026/08/03/aguacate-mexico/) | 2026-08-03 | ALTO | Listo |
| 6 | Maíz: México se encamina a importaciones récord mientras cae su siembra | [El Economista (vía Yahoo Noticias)](https://es-us.noticias.yahoo.com/m%C3%A9xico-batir%C3%A1-r%C3%A9cord-importaciones-ma%C3%ADz-061853490.html) | 2026-06-26 | ALTO | Listo |
| 7 | Precios globales de alimentos suben en agosto por presión en la oferta | [FAO](https://www.fao.org/newsroom/detail/supply-concerns-drive-fao-food-price-index-higher/en) | 2026-09-04 | ALTO | Listo |
| 8 | Tomate mexicano: EE.UU. mantiene la cuota antidumping de 17% | [FreshFruitPortal](https://www.freshfruitportal.com/news/2026/06/30/usitc-tomato-mx/) | 2026-06-30 | MEDIO | Listo |
| 9 | Consolidación AgTech: Elbit compra Bluewhite, pionera en tractores autónomos | [Future Farming](https://www.futurefarming.com/tech-in-focus/autonomous-semi-autosteering-systems/elbit-systems-acquires-bluewhite-a-new-chapter-for-autonomous-farming/) | 2026-06-02 | ALTO | Listo |
| 10 | Bayer Crop Science eleva su rentabilidad impulsada por glifosato | [Bayer](https://www.bayer.com/media/en-us/bayer-operationally-on-track-decisive-progress-on-strategic-priorities/) | 2026-08-04 | ALTO | Listo |
| 11 | BASF refuerza biológicos con la compra de AgBitech, activa en Brasil | [New AG International](https://www.newaginternational.com/biocontrol/basf-agricultural-solutions-acquires-biocontrol-company-agbitech/) | 2026-01-14 | MEDIO | Listo |
| 12 | Revisión del T-MEC: el agro aún espera su capítulo en la negociación | [El Financiero](https://www.elfinanciero.com.mx/economia/2026/07/23/cuarta-ronda-del-t-mec-ya-tiene-fecha-continuara-la-revision-hasta-septiembre/) | 2026-07-23 | MEDIO | Listo |
| 13 | Primer semestre 2026: la inversión AgTech toca un nuevo piso | [Agriculteca](https://www.agriculteca.com/articulos/la-inversion-en-agtech-se-desploma-en-h1-2026-el-rebote-este-ano-parece-improbable) | 2026-07-13 | MEDIO | Listo |

### México (16)

| # | Tema (título AGROVISION) | Fuente | Fecha | Evidencia | Estado |
|---|---|---|---|---|---|
| 1 | Aguacate de Michoacán: señales mixtas en la exportación de 2026 | [El Financiero](https://www.elfinanciero.com.mx/economia/2026/08/11/exportaciones-de-aguacate-caen-en-primer-semestre-de-2026-cual-fue-el-motivo/) | 2026-08-11 | MEDIO | Listo |
| 2 | Chihuahua recupera el cruce de ganado por Santa Teresa | [Excélsior](https://www.excelsior.com.mx/nacional/gusano-barrenador-eu-reabre-puerto-ganado-chihuahua-tras-baja-casos) | 2026-09-17 | MEDIO | Listo |
| 3 | Veracruz concentra la producción cañera del país | [La Silla Rota, con datos del SIAP](https://lasillarota.com/veracruz/estado/2026/8/21/veracruz-es-lider-nacional-en-produccion-de-cana-de-azucar-gracias-a-estos-5-municipios-525292.html) | 2026-08-21 | MEDIO | Listo |
| 4 | El superávit agroalimentario de México se contrae en el primer semestre de 2026 | [El Economista (vía Yahoo Noticias), con datos de GCMA](https://es-us.noticias.yahoo.com/super%C3%A1vit-agroalimentario-cae-12-semestre-150803153.html) | 2026-08-11 | ALTO | Listo |
| 5 | Sinaloa fija un precio objetivo de 6 mil pesos por tonelada para su maíz | [Sinaloa Dossier](https://sinaloadossier.com.mx/oficial/2026/04/22/gobierno-y-productores-acuerdan-precio-de-6-mil-pesos-por-tonelada-de-maiz/) | 2026-04-22 | ALTO | Listo |
| 6 | Sonora reabre la exportación de ganado a Estados Unidos por Agua Prieta | [El Imparcial](https://www.elimparcial.com/son/sonora/2026/08/24/eeuu-reabre-la-frontera-a-la-exportacion-de-ganado-mexicano-tras-mas-de-un-ano-de-cierre-por-el-gusano-barrenador-el-cruce-iniciara-por-agua-prieta/) | 2026-08-24 | MEDIO | Listo |
| 7 | Cosechando Soberanía acelera el crédito barato al campo | [Imagen Agropecuaria](https://imagenagropecuaria.com/2026/a-traves-de-cosechando-soberania-se-han-canalizado-creditos-por-4500-mdp-c-lopez/) | 2026-08-11 | MEDIO | Listo |
| 8 | Aguascalientes cofinancia la rehabilitación de pozos agrícolas | [Gobierno del Estado de Aguascalientes](https://informacion.aguascalientes.gob.mx/news/lanzan-apoyos-para-que-productores-agr%C3%ADcolas-mejoren-el-funcionamiento-de-sus-pozos-) | 2026-02-12 | ALTO | Listo |
| 9 | Yucatán encabeza la producción de miel de México | [El Informador](https://www.informador.mx/economia/mexico-potencia-mundial-en-miel-yucatan-lidera-produccion-20260819-0134.html) | 2026-08-19 | MEDIO | Listo |
| 10 | Querétaro y el mapa de la agricultura protegida | [Redagrícola, con datos del Censo Agropecuario de INEGI](https://redagricola.com/en-una-superficie-de-1346-hectareas-queretaro-concentra-384-unidades-productivas-bajo-agricultura-protegida/) | 2025-09-12 | MEDIO | Listo |
| 11 | Jalisco, epicentro de la industria mexicana de berries | [El Informador](https://www.informador.mx/jalisco/productores-impulsan-la-competitividad-de-las-berries-mexicanas-20260729-0153.html) | 2026-07-29 | MEDIO | Listo |
| 12 | Chihuahua entra al otoño con presas a una cuarta parte de su capacidad | [Azteca Ciudad Juárez](https://www.aztecaciudadjuarez.com/noticias/presas-de-chihuahua-caen-a-solo-26-de-almacenamiento/) | 2026-09-08 | MEDIO | Listo |
| 13 | Chiapas refuerza la sanidad del café con 32.2 millones federales | [Alerta Chiapas](https://alertachiapas.com/2026/07/08/cafe-chiapas-senasica-roya-2026/) | 2026-07-08 | ALTO | Listo |
| 14 | Guanajuato tecnifica sólo 0.2% de su superficie agrícola | [AM](https://www.am.com.mx/guanajuato/2026/05/09/lenta-tecnificacion-guanajato-1791774.html) | 2026-05-09 | MEDIO | Listo |
| 15 | Sembrando Vida mantiene su apoyo mensual en 2026 | [Infobae](https://www.infobae.com/mexico/2026/09/07/sembrando-vida-2026-confirman-fecha-del-pago-en-septiembre-para-todos-los-beneficiarios/) | 2026-09-07 | MEDIO | Listo |
| 16 | Las actividades primarias lideran el crecimiento del PIB en el segundo trimestre de 2026 | [INEGI](https://www.inegi.org.mx/contenidos/saladeprensa/boletines/2026/pibt/pib_Pconst2026_08.pdf) | 2026-08-24 | ALTO | Listo |
