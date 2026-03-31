create table if not exists analysis_runs (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references news_events(id) on delete cascade,
  analysis_version integer not null,
  provider text not null,
  model text not null,
  provider_status text not null,
  error text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, analysis_version)
);

create index if not exists analysis_runs_event_id_idx
  on analysis_runs (event_id, created_at desc);

create index if not exists analysis_runs_active_event_id_idx
  on analysis_runs (event_id, is_active)
  where is_active = true;

create table if not exists analysis_impacts (
  id uuid primary key default gen_random_uuid(),
  analysis_run_id uuid not null references analysis_runs(id) on delete cascade,
  symbol_id uuid not null references symbols(id) on delete cascade,
  sentiment text,
  direction text,
  magnitude text,
  confidence numeric(5, 2),
  time_horizon text,
  rationale text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (analysis_run_id, symbol_id)
);

create index if not exists analysis_impacts_analysis_run_id_idx
  on analysis_impacts (analysis_run_id);

create index if not exists analysis_impacts_symbol_id_idx
  on analysis_impacts (symbol_id);
