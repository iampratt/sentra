create table if not exists analysis_related_events (
  id uuid primary key default gen_random_uuid(),
  analysis_run_id uuid not null references analysis_runs(id) on delete cascade,
  related_event_id uuid not null references news_events(id) on delete cascade,
  point_id text not null,
  content_type text not null,
  score numeric(8, 6) not null,
  title text not null,
  summary text,
  canonical_url text,
  published_at timestamptz,
  region text,
  country text,
  created_at timestamptz not null default now(),
  unique (analysis_run_id, related_event_id, content_type)
);

create index if not exists analysis_related_events_analysis_run_id_idx
  on analysis_related_events (analysis_run_id);

create index if not exists analysis_related_events_related_event_id_idx
  on analysis_related_events (related_event_id);
