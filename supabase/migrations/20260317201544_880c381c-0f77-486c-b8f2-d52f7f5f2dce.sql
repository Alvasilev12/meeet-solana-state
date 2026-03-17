
-- Table for AI-generated content (twitter posts, recruitment messages)
CREATE TABLE public.ai_generated_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'twitter', -- twitter, recruitment, social
  content TEXT NOT NULL,
  context TEXT, -- what triggered this content
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_generated_content ENABLE ROW LEVEL SECURITY;

-- Public read for twitter content
CREATE POLICY "AI content publicly readable"
ON public.ai_generated_content FOR SELECT
USING (true);

-- Only service role can insert/update
CREATE POLICY "Service role manages AI content"
ON public.ai_generated_content FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Enable realtime for live feed
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_generated_content;
