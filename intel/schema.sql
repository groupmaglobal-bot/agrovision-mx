-- =========================================================================
-- AGROVISION INTELLIGENCE — esquema relacional (PostgreSQL / Supabase)
-- Equivalente 1:1 de intel/data/db.json. Úsalo cuando el volumen supere
-- unos miles de ítems o cuando varias personas editen a la vez.
-- Migración: node intel/cli.js export json → script de carga (ver README).
-- =========================================================================

create table sources (
  domain        text primary key,
  name          text not null,
  tier          smallint not null default 0 check (tier between 0 and 3), -- 1 primaria · 2 seria · 3 general · 0 desconocida
  type          text not null check (type in ('primary','secondary')),
  kind          text,                                 -- organismo, gobierno, empresa, medio…
  unreliable    boolean not null default false,
  feed_url      text,
  feed_ok       boolean,
  checked_at    timestamptz
);

create table countries      (id text primary key, name text not null unique);
create table mexican_states (id text primary key, name text not null unique);
create table technologies   (id text primary key, name text not null unique);
create table topics         (id text primary key, label text not null, terms text[] not null);
create table markets        (id text primary key, name text not null unique);

create table companies (
  id         text primary key,
  name       text not null unique,
  is_startup boolean not null default false,
  website    text
);

create table articles (
  id                    text primary key,                  -- agv-<hash de URL canónica>
  retrieved_at          timestamptz not null,
  ingested_via          text not null,                     -- rss · googlenews · manual · claude-websearch
  title_original        text not null,
  title_agrovision      text,
  source_domain         text references sources(domain),
  source_name           text not null,
  url                   text not null,
  canonical_url         text not null unique,
  published_at          date,
  country               text,
  mx_state              text,
  category              text check (category in ('AGRO','TECH','BUSINESS','MEXICO')),
  subcategory           text,
  secondary_categories  text[] default '{}',
  summary               text, why_matters text, what_changed text, key_fact text,
  impact_producers      text, impact_business text, impact_mexico text, business_opportunity text,
  problem               text, solution_tech text, who text, small_producer_access text, investment text, regulation text,
  contradictions        text,
  verification_notes    text,
  verified_by_fetch     boolean not null default false,
  analyst_evidence      text check (analyst_evidence in ('ALTO','MEDIO','BAJO')),
  evidence              text not null check (evidence in ('ALTO','MEDIO','BAJO')),
  status                text not null check (status in ('VERIFICADO','NO VERIFICADO')),
  score                 smallint check (score between 0 and 100),   -- USO INTERNO, nunca público
  priority              smallint,
  scoring               jsonb,                                       -- desglose: pesos, bonos, penalizaciones
  duplicate_of          text references articles(id),
  related_ids           text[] default '{}',
  publishable           boolean not null default false,
  suggested_formats     text[] default '{}',
  suggested_content     text[] default '{}',
  interview_ideas       text[] default '{}',
  flags                 jsonb default '{}'
);
create index on articles (published_at desc);
create index on articles (category, subcategory);
create index on articles (mx_state);
create index on articles (evidence);
create index on articles (publishable) where publishable;

create table article_technologies (article_id text references articles(id) on delete cascade, technology_id text references technologies(id), primary key (article_id, technology_id));
create table article_companies    (article_id text references articles(id) on delete cascade, company_id text references companies(id), primary key (article_id, company_id));
create table article_topics       (article_id text references articles(id) on delete cascade, topic_id text references topics(id), primary key (article_id, topic_id));

create table corroborations (
  id          bigserial primary key,
  article_id  text references articles(id) on delete cascade,
  name        text, url text not null,
  via         text,                                -- analista · misma-historia · relacionado
  tier        smallint
);

-- Regla editorial: cada dato con valor, unidad, periodo, territorio, fuente, URL y fecha de consulta
create table metrics (
  id            bigserial primary key,
  article_id    text references articles(id) on delete cascade,
  metric        text not null,
  value         numeric not null,
  unit          text not null,
  period        text not null,
  region        text not null,
  source        text not null,
  url           text not null check (url like 'https://%'),
  retrieved_at  date not null,
  methodology   text
);

create table trends (
  id              bigserial primary key,
  topic_id        text references topics(id),
  computed_at     timestamptz not null,
  score           smallint not null,          -- TREND SCORE interno
  mentions        int not null, recent int not null, prior int not null,
  direction       text check (direction in ('creciendo','estable','bajando')),
  source_kinds    text[], primary_sources int,
  item_ids        text[]
);

create table content_generated (
  id           text primary key,
  article_id   text references articles(id),
  type         text check (type in ('newsletter','instagram','reel','article','linkedin','stories')),
  path         text,
  body_md      text,
  created_at   timestamptz not null default now(),
  publishable  boolean not null,
  status       text not null                 -- NO VERIFICADO · borrador-listo-para-revision · aprobado · publicado
);

create table social_posts (
  id           text primary key references content_generated(id),
  channel      text check (channel in ('Instagram','LinkedIn','X','Facebook')),
  approved     boolean not null default false,
  approved_by  text, approved_at timestamptz,
  published_at timestamptz, external_url text
);

create table newsletter_issues (
  id         text primary key,               -- weekly-001
  issue      int not null unique,
  date       date not null,
  path       text, body_md text,
  status     text not null default 'borrador'
);

create table saved_articles (
  user_id    text not null,
  article_id text references articles(id) on delete cascade,
  saved_at   timestamptz not null default now(),
  note       text,
  primary key (user_id, article_id)
);

create table runs (
  id         text primary key,
  type       text not null,                  -- daily · trends · summary · weekly · search · import
  at         timestamptz not null,
  details    jsonb
);
