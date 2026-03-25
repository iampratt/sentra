alter table news_events
  add column if not exists content_hash text;

create unique index if not exists news_events_content_hash_unique_idx
  on news_events (content_hash)
  where content_hash is not null;
