
-- Actions table
CREATE TABLE public.actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  target_site TEXT,
  tags TEXT[] DEFAULT '{}',
  steps JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.actions ENABLE ROW LEVEL SECURITY;

-- Public access (no auth for now)
CREATE POLICY "Public read actions" ON public.actions FOR SELECT USING (true);
CREATE POLICY "Public insert actions" ON public.actions FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update actions" ON public.actions FOR UPDATE USING (true);
CREATE POLICY "Public delete actions" ON public.actions FOR DELETE USING (true);

-- Executions table
CREATE TABLE public.executions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  action_id UUID REFERENCES public.actions(id) ON DELETE SET NULL,
  action_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'success', 'failed')),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  duration INTEGER,
  steps JSONB NOT NULL DEFAULT '[]',
  result JSONB,
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read executions" ON public.executions FOR SELECT USING (true);
CREATE POLICY "Public insert executions" ON public.executions FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update executions" ON public.executions FOR UPDATE USING (true);
CREATE POLICY "Public delete executions" ON public.executions FOR DELETE USING (true);

-- Updated_at trigger for actions
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_actions_updated_at
  BEFORE UPDATE ON public.actions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
