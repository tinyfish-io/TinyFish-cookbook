create table public.deal_cache (
  id          uuid primary key default gen_random_uuid(),
  district    text not null,
  website     text not null,
  venue_data  jsonb not null,
  scraped_at  timestamptz not null default now(),
  unique(district, website)
);

create index idx_deal_cache_district on public.deal_cache using btree (district);
create index idx_deal_cache_scraped_at on public.deal_cache using btree (scraped_at desc nulls last);
