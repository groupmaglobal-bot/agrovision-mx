/* =========================================================================
   AGROVISION_MX — Fuente única de contenido
   -------------------------------------------------------------------------
   Todo el contenido factual del sitio vive aquí: artículos, datos, estados,
   "¿Sabías que?" y fuentes. La UI (app.js) y el build (scripts/build.mjs)
   leen este archivo. Para agregar un artículo: copia un objeto de
   `articles`, cambia el `id` (slug) y ejecuta `npm run build`.

   Regla editorial: NINGUNA cifra sin fuente. Cada dato lleva
   { source, year, url }. Si no hay fuente verificable, no se publica.
   ========================================================================= */
(function (root) {
  var U = 'https://images.unsplash.com/';
  function img(id, w) { return U + id + '?w=' + (w || 1200) + '&q=70&auto=format&fit=crop'; }

  /* ---------- Fuentes verificadas (se reutilizan por id) ---------- */
  var SOURCES = {
    aquastat:  { name: 'FAO AQUASTAT', year: 'Metodología vigente', url: 'https://www.fao.org/aquastat/en/overview/methodology/water-use' },
    wpp2024:   { name: 'ONU DAES · World Population Prospects', year: '2024', url: 'https://www.un.org/en/UN-projects-world-population-to-peak-within-this-century' },
    fao608:    { name: 'FAO', year: '2021', url: 'https://www.fao.org/newsroom/detail/Small-family-farmers-produce-a-third-of-the-world-s-food/en' },
    censo2022: { name: 'INEGI · Censo Agropecuario 2022', year: '2023', url: 'https://www.inegi.org.mx/contenidos/saladeprensa/boletines/2023/CA_Def/CA_Def2022.pdf' },
    inegiDMA:  { name: 'INEGI · Día Mundial de la Agricultura', year: '2025', url: 'https://www.inegi.org.mx/contenidos/saladeprensa/aproposito/2025/EAP_DMAgricultura_25.pdf' },
    balanza25: { name: 'SADER · SIAP, Balanza agroalimentaria', year: '2025', url: 'https://nube.agricultura.gob.mx/BalanzaComercial/diciembre2025.php' },
    faoItu:    { name: 'FAO / UIT · Drones for agriculture', year: '2018', url: 'https://www.fao.org/e-agriculture/news/new-publication-fao-itu-e-agriculture-action-drones-agriculture' },
    faoDigital:{ name: 'FAO · Agricultura digital', year: 'Vigente', url: 'https://www.fao.org/digital-agriculture/en/' },
    faoHiH:    { name: 'FAO · Hand-in-Hand Geospatial Platform', year: 'Vigente', url: 'https://www.fao.org/hih-geospatial-platform/en' },
    sentinel2: { name: 'ESA · Sentinel-2', year: 'Vigente', url: 'https://www.esa.int/Applications/Observing_the_Earth/Copernicus/Sentinel-2' },
    sinMaiz:   { name: 'Gobierno de Sinaloa, con datos SIAP', year: '2024', url: 'https://estadisticas.sinaloa.gob.mx/eBooks/Temas/AGRICULTURA2025.pdf' },
    michAgu:   { name: 'SADER Michoacán', year: '2025–2026', url: 'https://sader.michoacan.gob.mx/michoacan-cosecho-un-millon-460-mil-toneladas-de-aguacate-en-la-temporada-2025-2026/' },
    michGuay:  { name: 'SADER Michoacán', year: '2025', url: 'https://sader.michoacan.gob.mx/michoacan-primer-lugar-nacional-en-produccion-de-guayaba-sader/' },
    sonTrigo:  { name: 'SENASICA', year: 'Ciclo OI 2020–2021', url: 'https://prod.senasica.gob.mx/ALERTAS/inicio/pages/single.php?noticia=9049' },
    chihMan:   { name: 'Gobierno de Chihuahua, con datos SIAP', year: '2024', url: 'https://chihuahua.gob.mx/prensa/es-chihuahua-lider-productor-de-manzana-con-el-85-del-total-nacional' },
    chihNuez:  { name: 'Gobierno de Chihuahua', year: '2024', url: 'https://chihuahua.gob.mx/prensa/lidera-chihuahua-ranking-de-produccion-de-nuez-con-597-de-aportacion-nivel-nacional' },
    gtoLech:   { name: 'Gobierno de Guanajuato · SDAyR', year: '2023', url: 'https://boletines.guanajuato.gob.mx/tag/cultivo/' }
  };

  /* ---------- Fotografías (Unsplash License, hotlink al CDN oficial) ----------
     Para sustituir: cambia `id` por otra foto o por una ruta local
     (p. ej. 'assets/img/fotos/hero.webp') y ajusta `credit`/`page`.        */
  var PHOTOS = {
    hero:     { id: 'photo-1560198927-b31ef30c5867', alt: 'Vista aérea de campos agrícolas verdes con surcos bajo luz natural', credit: 'Ivan Bandura', page: 'https://unsplash.com/photos/aerial-view-of-green-field-gkzByAvMki8' },
    rows:     { id: 'photo-1560493676-04071c5f467b', alt: 'Hileras de cultivo verde al atardecer', credit: 'Dan Meyers', page: 'https://unsplash.com/photos/rows-of-green-crops-in-field-at-sunset-IQVFVH0ajag' },
    greenhouse:{ id: 'photo-1524486361537-8ad15938e1a3', alt: 'Hileras de plantas de jitomate dentro de un gran invernadero', credit: 'Erwan Hesry', page: 'https://unsplash.com/photos/1q75BReKpms' },
    drone:    { id: 'photo-1713952160156-bb59cac789a9', alt: 'Dron agrícola aplicando sobre un campo de cultivo en hileras', credit: 'DRONE EFT', page: 'https://unsplash.com/photos/nMDwrS1NsIE' },
    irrigation:{ id: 'photo-1738598665698-7fd7af4b5e0c', alt: 'Aspersores de riego lanzando agua sobre un campo de maíz', credit: 'Being Organic in EU', page: 'https://unsplash.com/photos/two-sprinklers-spraying-water-on-a-corn-field-ZYiOik4jels' },
    agave:    { id: 'photo-1706888135824-20ec9010b7bc', alt: 'Campo de agave azul con montañas al fondo', credit: 'Scott Tobin', page: 'https://unsplash.com/photos/HroSMavJhlo' },
    corn:     { id: 'photo-1511817354854-e361703ac368', alt: 'Mazorca de maíz en la planta dentro de un cultivo verde', credit: 'Christophe Maertens', page: 'https://unsplash.com/photos/corncob-on-plants-photograph-v9r31Dxg0X0' },
    tractor:  { id: 'photo-1634143174678-ecd0c3c2375b', alt: 'Tractor avanzando por un amplio campo de cultivo', credit: 'Loren King', page: 'https://unsplash.com/photos/IXLL6zy1EdA' },
    hands:    { id: 'photo-1492496913980-501348b61469', alt: 'Manos de un productor sosteniendo tierra fértil', credit: 'Gabriel Jimenez', page: 'https://unsplash.com/photos/bokeh-photography-of-person-carrying-soil-jin4W1HqgL4' },
    patchwork:{ id: 'photo-1547336863-6491b008052b', alt: 'Mosaico de parcelas agrícolas visto desde el aire', credit: 'Ryan Grice', page: 'https://unsplash.com/photos/birds-eye-photo-of-fields-IZK2L0dvfME' }
  };
  Object.keys(PHOTOS).forEach(function (k) {
    var p = PHOTOS[k];
    p.src = img(p.id, 1200); p.small = img(p.id, 640); p.large = img(p.id, 1920);
  });

  /* ---------- Artículos ---------- */
  var AUTHOR = 'Redacción AGROVISION_MX';
  var articles = [
    {
      id: 'smart-farming-campo-con-datos',
      title: 'Smart Farming: cuando el campo empieza a pensar con datos',
      subtitle: 'Sensores, imágenes satelitales y software ya permiten observar un cultivo con una frecuencia que antes era imposible.',
      category: 'AGROTECH', date: '2026-09-19', author: AUTHOR, photo: 'rows',
      excerpt: 'La agricultura inteligente integra sensores, imágenes y software para decidir con evidencia. Así funciona y esto es lo que significa para el productor.',
      body: [
        'La agricultura inteligente (smart farming) no es una máquina ni una app: es una forma de trabajar. Consiste en medir lo que pasa en la parcela, convertir esas mediciones en información y usarla para decidir cuándo regar, fertilizar, aplicar o cosechar.',
        '## Así funciona',
        'Las fuentes de datos son tres. En el suelo, sensores que registran humedad o temperatura. En el aire, drones con cámaras. Y en el espacio, satélites de observación de la Tierra. La misión europea Sentinel-2, del programa Copernicus, capta 13 bandas espectrales con resolución de hasta 10 metros y, con dos satélites en órbita, vuelve a observar el mismo punto cada 5 días; la ESA destaca su utilidad para vigilar la salud de los cultivos.',
        'Esas imágenes permiten calcular índices como el NDVI, que compara cómo refleja la vegetación la luz roja y la infrarroja cercana. Un valor que baja en una zona de la parcela no dice por sí solo qué pasa, pero sí indica dónde conviene revisar.',
        '## ¿Qué significa para el productor?',
        'La promesa no es sustituir la experiencia, sino enfocarla: recorrer primero la zona con problemas, aplicar insumos solo donde hacen falta y documentar cada decisión. La FAO impulsa el uso de tecnologías de la información y la innovación digital en la agricultura y el desarrollo rural.',
        '> Del campo al dato: medir, entender y actuar.'
      ],
      sources: ['sentinel2', 'faoDigital']
    },
    {
      id: 'ia-en-agricultura',
      title: 'IA en agricultura: de la experimentación a la aplicación',
      subtitle: 'Qué hace realmente la inteligencia artificial en el campo y qué preguntas conviene hacer antes de adoptarla.',
      category: 'INNOVACIÓN', date: '2026-09-19', author: AUTHOR, photo: 'greenhouse',
      excerpt: 'La inteligencia artificial en el agro trabaja sobre datos: imágenes, clima y registros. Sin buenos datos, no hay buen modelo.',
      body: [
        'Cuando se habla de inteligencia artificial en el agro, casi siempre se habla de modelos que reconocen patrones en datos: imágenes de hojas, series de clima, registros de rendimiento. El modelo no «sabe» agricultura; aprende de ejemplos.',
        '## Dónde se aplica',
        'Los usos más comunes combinan visión por computadora con imágenes de drones o satélites para detectar zonas con posible estrés, clasificar productos por calidad o estimar el avance de un cultivo. Plataformas abiertas como Hand-in-Hand de la FAO reúnen capas geoespaciales y estadísticas agrícolas que sirven como base para este tipo de análisis.',
        '## Las preguntas correctas',
        '¿Con qué datos se entrenó el modelo? ¿Funciona en mis condiciones de suelo, clima y variedad? ¿Quién es dueño de los datos de mi parcela? ¿Qué hago cuando el modelo se equivoca? Estas preguntas pesan más que la marca del software.',
        'La IA amplifica la capacidad de observar y decidir. La decisión sigue siendo del productor.'
      ],
      sources: ['faoHiH', 'faoDigital']
    },
    {
      id: 'drones-agricolas',
      title: 'Drones agrícolas: de la fotografía al análisis',
      subtitle: 'El valor del dron no está en la foto aérea, sino en lo que se puede medir con ella.',
      category: 'AGROTECH', date: '2026-09-19', author: AUTHOR, photo: 'drone',
      excerpt: 'Según la FAO y la UIT, los drones se usan para monitorear cultivos, alertas tempranas, control de plagas y más.',
      body: [
        'Un dron agrícola es, antes que nada, un sensor que vuela. Puede llevar cámaras de color, multiespectrales o térmicas, y en algunos modelos un sistema de aplicación.',
        '## Para qué se usan',
        'La publicación «E-agriculture in action: Drones for agriculture» (FAO y UIT, 2018) documenta usos en cultivos, sistemas de alerta temprana, monitoreo de plantas, control de plagas, rastreo de animales y monitoreo forestal y ambiental. Sus casos de estudio incluyen mapeo de arroz, gestión del riesgo de desastres y seguros agrícolas.',
        '## De la foto al dato',
        'Una sola foto aérea impresiona; una serie de vuelos sobre la misma parcela, procesada con el mismo método, permite comparar semanas, detectar cambios y medir si una decisión funcionó. Ahí está el valor.',
        'Antes de volar conviene revisar la regulación aplicable al uso de drones y, sobre todo, definir qué pregunta se quiere responder.'
      ],
      sources: ['faoItu']
    },
    {
      id: 'producir-mejor',
      title: 'El reto no es solamente producir más. Es producir mejor.',
      subtitle: 'Más personas, el mismo planeta y un recurso crítico: el agua.',
      category: 'AGRO', date: '2026-09-19', author: AUTHOR, photo: 'irrigation',
      excerpt: 'La agricultura concentra cerca del 70 % de las extracciones de agua dulce del mundo. Producir mejor empieza por ahí.',
      body: [
        'La ONU proyecta que la población mundial pasará de unos 8,200 millones de personas en 2024 a un máximo cercano a 10,300 millones a mediados de la década de 2080.',
        '## El agua, primero',
        'De acuerdo con FAO AQUASTAT, a nivel mundial alrededor del 69 % de las extracciones de agua dulce corresponde a la agricultura, frente a 19 % de la industria y 12 % del uso municipal. Cada mejora en eficiencia de riego tiene un efecto enorme.',
        '## Quién produce',
        'La FAO estima que existen más de 608 millones de explotaciones familiares en el mundo. Cinco de cada seis tienen menos de 2 hectáreas, y esas fincas pequeñas producen cerca del 35 % de los alimentos del mundo. Cualquier tecnología que no llegue a ellas deja fuera a la mayoría.',
        'Producir mejor significa más información por hectárea, menos desperdicio de agua e insumos, y decisiones que se puedan medir.'
      ],
      sources: ['wpp2024', 'aquastat', 'fao608']
    },
    {
      id: 'campo-mexicano-censo-2022',
      title: 'El campo mexicano en números: lo que dice el Censo Agropecuario 2022',
      subtitle: 'Unidades de producción, superficie y agricultura protegida según el INEGI.',
      category: 'MÉXICO', date: '2026-09-19', author: AUTHOR, photo: 'agave',
      excerpt: 'El INEGI registró 5.19 millones de unidades de producción agropecuarias y forestales; 30,179 usan agricultura protegida.',
      body: [
        'El Censo Agropecuario 2022 del INEGI es la radiografía más completa del campo mexicano disponible. Estos son algunos de sus resultados definitivos.',
        '## Unidades de producción',
        'Se registraron 5,194,342 unidades de producción agropecuarias y forestales; de ellas, 4,629,134 tenían actividad agropecuaria.',
        '## Superficie',
        'La superficie de uso agrícola sumó 29,806,706 hectáreas. En las unidades con actividad, la superficie agrícola fue de 25,703,081 hectáreas.',
        '## Tecnología en campo',
        'El censo contabilizó 30,179 unidades de producción con agricultura protegida (invernaderos, malla sombra y similares) en 77,417 hectáreas. Es una señal de hacia dónde se mueve parte del sector: más control sobre las condiciones de cultivo.',
        '## Especialización regional',
        'Con datos del mismo censo, el INEGI reporta que Jalisco produjo 1,974,504 toneladas de agave, el 66.4 % del total nacional.'
      ],
      sources: ['censo2022', 'inegiDMA']
    },
    {
      id: 'balanza-agroalimentaria-2025',
      title: 'Balanza agroalimentaria: México cerró 2025 con superávit',
      subtitle: 'Qué significa el saldo positivo y por qué conviene leerlo con contexto.',
      category: 'NEGOCIO', date: '2026-09-19', author: AUTHOR, photo: 'corn',
      excerpt: 'Según SADER-SIAP, la balanza agroalimentaria de 2025 tuvo un superávit de 3,730 millones de dólares.',
      body: [
        'La balanza comercial agroalimentaria compara lo que México vende al exterior en productos agropecuarios, pesqueros y agroindustriales contra lo que compra.',
        '## El dato',
        'De acuerdo con el reporte de diciembre de 2025 de SADER-SIAP, el saldo del año fue positivo en 3,730 millones de dólares: 577 millones en el rubro agropecuario y pesquero, y 3,153 millones en el agroindustrial.',
        '## El contexto',
        'El mismo reporte señala que las exportaciones agropecuarias y pesqueras de 2025 fueron 10.8 % menores que en 2024. Un superávit no siempre significa crecimiento: puede mantenerse aun cuando las ventas bajan, si las compras también cambian.',
        '## ¿Qué significa para el productor?',
        'El mercado externo sigue siendo una oportunidad, pero con volatilidad. Diversificar destinos, cumplir normas y conocer los costos reales por hectárea deja de ser opcional.'
      ],
      sources: ['balanza25']
    }
  ];
  articles.forEach(function (a) { a.image = PHOTOS[a.photo]; });

  /* ---------- Indicadores de datos (todos con fuente) ---------- */
  var data = {
    water: { title: 'Extracciones de agua dulce en el mundo', unit: '%', parts: [
      { label: 'Agricultura', value: 69, color: 'green' }, { label: 'Industria', value: 19, color: 'blue' }, { label: 'Municipal', value: 12, color: 'yellow' }
    ], source: 'aquastat' },
    census: { title: 'Unidades de producción en México', items: [
      { label: 'Agropecuarias y forestales', value: 5194342 }, { label: 'Con actividad agropecuaria', value: 4629134 }
    ], source: 'censo2022' },
    protectedAg: { title: 'Agricultura protegida en México', items: [
      { label: 'Unidades de producción', value: 30179, suffix: '' }, { label: 'Hectáreas', value: 77417, suffix: ' ha' }
    ], source: 'censo2022' },
    trade: { title: 'Superávit agroalimentario 2025', unit: 'millones de USD', total: 3730, parts: [
      { label: 'Agroindustrial', value: 3153, color: 'green' }, { label: 'Agropecuario y pesquero', value: 577, color: 'lime' }
    ], source: 'balanza25' },
    population: { title: 'Población mundial', points: [
      { label: '2024', value: 8.2 }, { label: 'Máximo · mediados de 2080', value: 10.3 }
    ], unit: 'miles de millones', source: 'wpp2024' },
    satellite: { title: 'Sentinel-2: ojos en órbita', items: [
      { label: 'Resolución', value: 10, suffix: ' m' }, { label: 'Revisita con 2 satélites', value: 5, suffix: ' días' }, { label: 'Bandas espectrales', value: 13, suffix: '' }
    ], source: 'sentinel2' }
  };

  /* ---------- Estados (mapa) — solo datos con fuente; si no, "Próximamente" ---------- */
  var states = [
    ['BC','Baja California',0,0],['SON','Sonora',1,0],['CHIH','Chihuahua',2,0],['COAH','Coahuila',3,0],['NL','Nuevo León',4,0],
    ['BCS','Baja California Sur',0,1],['SIN','Sinaloa',1,1],['DGO','Durango',2,1],['ZAC','Zacatecas',3,1],['SLP','San Luis Potosí',4,1],['TAM','Tamaulipas',5,1],
    ['NAY','Nayarit',1,2],['JAL','Jalisco',2,2],['AGS','Aguascalientes',3,2],['GTO','Guanajuato',4,2],['QRO','Querétaro',5,2],['HGO','Hidalgo',6,2],['YUC','Yucatán',9,2],
    ['COL','Colima',1,3],['MICH','Michoacán',2,3],['MEX','Estado de México',3,3],['CDMX','Ciudad de México',4,3],['TLAX','Tlaxcala',5,3],['VER','Veracruz',6,3],['TAB','Tabasco',7,3],['CAMP','Campeche',8,3],['QROO','Quintana Roo',9,3],
    ['GRO','Guerrero',2,4],['MOR','Morelos',3,4],['PUE','Puebla',4,4],['OAX','Oaxaca',5,4],['CHIS','Chiapas',6,4]
  ].map(function (s) { return { code: s[0], name: s[1], x: s[2], y: s[3] }; });

  var stateFacts = {
    AGS:  { featured: true, category: 'Frutales', fact: 'Tercer productor nacional de guayaba, con 17 % de la producción.', source: 'michGuay' },
    JAL:  { featured: true, category: 'Agave y granos', fact: 'Produjo el 66.4 % del agave nacional (Censo 2022) y fue primer productor de maíz grano en 2024.', source: 'inegiDMA', source2: 'sinMaiz' },
    GTO:  { featured: true, category: 'Hortalizas', fact: 'Líder nacional en producción de lechuga, con unas 138 mil toneladas al año.', source: 'gtoLech' },
    SIN:  { featured: true, category: 'Granos', fact: 'Segundo productor nacional de maíz grano en volumen y valor en 2024.', source: 'sinMaiz' },
    SON:  { featured: true, category: 'Trigo', fact: 'Aporta el 53 % de la producción nacional de trigo.', source: 'sonTrigo' },
    MICH: { featured: true, category: 'Aguacate y frutales', fact: 'Principal productor de aguacate: concentra más del 70 % de la superficie nacional del cultivo.', source: 'michAgu' },
    CHIH: { featured: true, category: 'Manzana y nuez', fact: 'Líder en manzana, con el 85.2 % de la producción nacional.', source: 'chihMan', source2: 'chihNuez' },
    QRO:  { featured: true, category: 'Agroindustria', fact: null }
  };
  states.forEach(function (s) { var f = stateFacts[s.code]; s.featured = !!(f && f.featured); s.info = f || null; });

  /* ---------- ¿Sabías que...? ---------- */
  var facts = [
    { text: 'Los satélites Sentinel-2 pueden volver a observar el mismo punto de la Tierra cada 5 días, con resolución de hasta 10 metros.', source: 'sentinel2' },
    { text: 'La agricultura concentra cerca del 69 % de las extracciones de agua dulce del mundo.', source: 'aquastat' },
    { text: 'En México, 30,179 unidades de producción trabajan con agricultura protegida, en 77,417 hectáreas.', source: 'censo2022' },
    { text: 'Jalisco produce dos de cada tres toneladas de agave del país: el 66.4 % del total nacional.', source: 'inegiDMA' },
    { text: 'En el mundo hay más de 608 millones de explotaciones familiares; las menores de 2 hectáreas producen cerca del 35 % de los alimentos.', source: 'fao608' },
    { text: 'Los drones se usan para monitorear plantas, emitir alertas tempranas y controlar plagas, según la FAO y la UIT.', source: 'faoItu' }
  ];

  root.AGV = { SOURCES: SOURCES, PHOTOS: PHOTOS, articles: articles, data: data, states: states, facts: facts, img: img,
    SITE: { url: 'https://groupmaglobal-bot.github.io/agrovision-mx/', instagram: 'https://www.instagram.com/agrovision_mx/', instagramDM: 'https://ig.me/m/agrovision_mx', handle: '@agrovision_mx' } };
})(typeof window !== 'undefined' ? window : globalThis);
