-- Cache table for District Rent Shark vibe/neighborhood data
-- Stores scraped district vibe results per city/district with 6-hour TTL

create table public.vibe_cache (
  id          uuid primary key default gen_random_uuid(),
  city        text not null,
  district    text not null,
  vibe_data   jsonb not null,
  scraped_at  timestamptz not null default now(),
  unique(city, district)
);

create index idx_vibe_cache_city
  on public.vibe_cache using btree (city);

create index idx_vibe_cache_scraped_at
  on public.vibe_cache using btree (scraped_at desc nulls last);
