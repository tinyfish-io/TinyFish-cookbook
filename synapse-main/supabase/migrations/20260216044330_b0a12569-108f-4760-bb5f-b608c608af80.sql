
-- Table to store per-action API keys
CREATE TABLE public.action_api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  action_id UUID NOT NULL REFERENCES public.actions(id) ON DELETE CASCADE,
  api_key TEXT NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex') UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.action_api_keys ENABLE ROW LEVEL SECURITY;

-- Public access (no auth in this app)
CREATE POLICY "Public read action_api_keys" ON public.action_api_keys FOR SELECT USING (true);
CREATE POLICY "Public insert action_api_keys" ON public.action_api_keys FOR INSERT WITH CHECK (true);
CREATE POLICY "Public delete action_api_keys" ON public.action_api_keys FOR DELETE USING (true);

-- Index for fast lookup by api_key
CREATE INDEX idx_action_api_keys_api_key ON public.action_api_keys(api_key);
