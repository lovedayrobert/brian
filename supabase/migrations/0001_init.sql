-- Brian schema for the hosted build (Supabase Postgres + pgvector).
-- Mirrors src/lib/domain/types.ts. The prototype runs on a local JSON store
-- behind the same Repository interface; swapping means implementing it once.

create extension if not exists vector;

create table brand (id text primary key, name text not null);
create table brand_book (brand_id text references brand(id), version int not null, content jsonb not null, created_at timestamptz default now(), primary key (brand_id, version));
create table advantage (id text primary key, brand_id text references brand(id), claim text not null, proof_url text);
create table benchmark (id bigserial primary key, brand_id text references brand(id), channel text, metric text, value numeric, provenance text check (provenance in ('measured','benchmark','assumption')), source_url text, as_of date);

create table source (id text primary key, name text, category text, config jsonb, last_run_at timestamptz);
create table sweep_run (id text primary key, started_at timestamptz, finished_at timestamptz, sources jsonb);

create table signal (
  id text primary key,
  source_id text references source(id),
  url text, title text, summary text, author text, image_url text,
  metric jsonb, series jsonb, rates jsonb, related jsonb, topics text[],
  embedding vector(1024),
  captured_at timestamptz, published_at timestamptz
);
create index signal_embedding_idx on signal using hnsw (embedding vector_cosine_ops);

create table trend (
  id text primary key, title text, summary text, category text,
  relevance numeric, relevance_method text, why_it_matters text,
  signal_ids text[], source_ids text[], series jsonb, series_label text, headline jsonb,
  sensitivity text, sensitivity_reason text, image_url text, updated_at timestamptz
);
create table lifecycle_assessment (id bigserial primary key, trend_id text references trend(id) on delete cascade, stage text, confidence text, confidence_score numeric, velocity numeric, acceleration numeric, peak_ratio numeric, baseline_ratio numeric, evidence text[], assessed_at timestamptz default now());
create table moment (id text primary key, kind text check (kind in ('breaking','calendar')), title text, date timestamptz, category text, description text, source_url text, sources jsonb, sensitivity text, sensitivity_reason text, outlets int, searches int, relevance numeric, date_note text);

create table idea (
  id text primary key, brand_id text references brand(id), trend_id text references trend(id), moment_id text references moment(id),
  name text, one_liner text, headline text, edge text, backlash text, mechanism text, borrowed_attention text,
  scores jsonb, status text, key_visual_prompt text, created_at timestamptz default now()
);
create table screening (idea_id text primary key references idea(id) on delete cascade, critic jsonb, prior_art jsonb, red_lines jsonb);
create table claim (id bigserial primary key, owner_type text, owner_id text, text text, status text check (status in ('verified','unresolved')));
create table citation (id bigserial primary key, claim_id bigint references claim(id) on delete cascade, url text, title text, publisher text, retrieved_at timestamptz);

create table package (id text primary key, idea_id text references idea(id), brand_id text references brand(id), status text, version int, launch_date date, created_at timestamptz, updated_at timestamptz);
create table package_section (package_id text references package(id) on delete cascade, key text, status text, content jsonb, error text, model text, updated_at timestamptz, primary key (package_id, key));
create table version (id bigserial primary key, package_id text references package(id) on delete cascade, version int, snapshot jsonb, instruction text, created_at timestamptz default now());
create table input (id bigserial primary key, package_id text references package(id) on delete cascade, key text, label text, unit text, low numeric, expected numeric, high numeric, provenance text, origin text, citation_url text);
create table asset (id text primary key, package_id text references package(id) on delete cascade, channel text, format text, spec text, render_url text);
create table asset_variant (id text primary key, asset_id text references asset(id) on delete cascade, label text, copy text, render_url text);
create table production_task (id text primary key, package_id text references package(id) on delete cascade, title text, spec jsonb, role text, due_date date, depends_on text[], linear_id text);
create table approval_gate (id bigserial primary key, package_id text references package(id) on delete cascade, name text, approver text, due_date date, checks text[], approved_at timestamptz);
create table rapid_response (id text primary key, moment_id text references moment(id), brand_id text references brand(id), takes jsonb, chosen int, assets jsonb, created_at timestamptz default now());

create table campaign (id text primary key, package_id text references package(id), live_from date, live_to date, tracking jsonb);
create table result (id bigserial primary key, campaign_id text references campaign(id) on delete cascade, metric text, forecast jsonb, actual numeric, measured_at timestamptz);
create table backtest (id bigserial primary key, ran_at timestamptz, result jsonb);

create table agent_run (id text primary key, agent text, model text, started_at timestamptz, duration_ms int, input_tokens int, output_tokens int, cost_usd numeric, ok boolean, error text, subject text);
create table comment (id bigserial primary key, entity_type text, entity_id text, author text, body text, created_at timestamptz default now());
create table audit_event (id bigserial primary key, actor text, action text, entity_type text, entity_id text, detail jsonb, at timestamptz default now());
