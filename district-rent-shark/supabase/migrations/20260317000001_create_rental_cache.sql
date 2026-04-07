-- Cache table for District Rent Shark
-- Stores scraped rental listing results per city/website with 6-hour TTL

create table public.rental_cache (
  id          uuid primary key default gen_random_uuid(),
  city        text not null,
  website     text not null,
  listing_data jsonb not null,
  scraped_at  timestamptz not null default now(),
  unique(city, website)
);

create index idx_rental_cache_city
  on public.rental_cache using btree (city);

create index idx_rental_cache_scraped_at
  on public.rental_cache using btree (scraped_at desc nulls last);
