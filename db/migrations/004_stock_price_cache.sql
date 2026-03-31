create table if not exists stock_price_cache (
  provider_symbol text primary key,
  ticker text not null,
  exchange text not null,
  market text not null,
  currency text,
  last_close double precision,
  previous_close double precision,
  change_percent double precision,
  last_trading_at timestamptz,
  status text not null,
  error text,
  fetched_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists stock_price_cache_fetched_at_idx
  on stock_price_cache (fetched_at desc);
