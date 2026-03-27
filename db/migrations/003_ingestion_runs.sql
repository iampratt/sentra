create table if not exists ingestion_runs (
  id uuid primary key default gen_random_uuid(),
  source_type text not null,
  trigger_type text not null default 'manual',
  status text not null,
  inserted_count integer not null default 0,
  duplicate_count integer not null default 0,
  failed_count integer not null default 0,
  sources_count integer not null default 0,
  details jsonb not null default '[]'::jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists ingestion_runs_started_at_idx
  on ingestion_runs (started_at desc);
