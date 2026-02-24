-- Cache table for Vietnam Bike Price Scout
-- Stores scraped bike shop results per city/website with 6-hour TTL

create table public.bike_cache (
  id          uuid primary key default gen_random_uuid(),
  city        text not null,
  website     text not null,
  shop_data   jsonb not null,
  scraped_at  timestamptz not null default now(),
  unique(city, website)
);

create index idx_bike_cache_city
  on public.bike_cache using btree (city);

create index idx_bike_cache_scraped_at
  on public.bike_cache using btree (scraped_at desc nulls last);