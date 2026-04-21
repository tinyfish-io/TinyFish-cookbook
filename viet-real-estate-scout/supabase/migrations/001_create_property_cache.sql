CREATE TABLE IF NOT EXISTS property_cache (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  search_key TEXT NOT NULL,
  source_site TEXT NOT NULL,
  listing_data JSONB NOT NULL,
  scraped_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (search_key, source_site)
);

CREATE INDEX IF NOT EXISTS idx_property_cache_lookup
  ON property_cache (search_key, scraped_at);
