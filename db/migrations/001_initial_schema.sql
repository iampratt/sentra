create extension if not exists pgcrypto;

create table if not exists news_sources (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  source_type text not null,
  homepage_url text,
  feed_url text,
  country text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists news_events (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references news_sources(id) on delete set null,
  title text not null,
  summary text,
  raw_content text,
  canonical_url text unique,
  published_at timestamptz not null,
  region text,
  country text,
  location_lat double precision,
  location_lng double precision,
  severity text,
  sentiment text,
  category text,
  impact_window text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists news_events_published_at_idx
  on news_events (published_at desc);

create index if not exists news_events_country_idx
  on news_events (country);

create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  country text,
  sector text,
  industry text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists symbols (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  ticker text not null,
  exchange text not null,
  market text not null,
  currency text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (ticker, exchange)
);

create index if not exists symbols_market_idx
  on symbols (market);

create table if not exists event_symbol_impacts (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references news_events(id) on delete cascade,
  symbol_id uuid not null references symbols(id) on delete cascade,
  sentiment text,
  direction text,
  magnitude text,
  confidence numeric(5, 2),
  time_horizon text,
  rationale text,
  created_at timestamptz not null default now(),
  unique (event_id, symbol_id)
);

create index if not exists event_symbol_impacts_event_id_idx
  on event_symbol_impacts (event_id);
