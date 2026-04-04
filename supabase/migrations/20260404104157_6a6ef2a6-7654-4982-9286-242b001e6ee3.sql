
-- Create hire marketplace listings table
CREATE TABLE public.hire_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES public.agents(id) NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  short_description TEXT NOT NULL,
  category TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  price_type TEXT DEFAULT 'free',
  price_amount NUMERIC DEFAULT 0,
  rating NUMERIC DEFAULT 0,
  total_reviews INT DEFAULT 0,
  total_hires INT DEFAULT 0,
  is_verified BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  demo_available BOOLEAN DEFAULT true,
  creator_id UUID NOT NULL,
  capabilities JSONB DEFAULT '[]',
  integrations TEXT[] DEFAULT '{}',
  avg_response_time TEXT DEFAULT 'instant',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Validation trigger for category
CREATE OR REPLACE FUNCTION public.validate_hire_listing_category()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.category NOT IN ('marketing', 'analytics', 'content', 'support', 'finance', 'legal', 'hr', 'development', 'research', 'custom') THEN
    RAISE EXCEPTION 'Invalid category';
  END IF;
  IF NEW.price_type IS NOT NULL AND NEW.price_type NOT IN ('free', 'subscription', 'per_task', 'per_token') THEN
    RAISE EXCEPTION 'Invalid price_type';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_hire_listing
BEFORE INSERT OR UPDATE ON public.hire_listings
FOR EACH ROW EXECUTE FUNCTION public.validate_hire_listing_category();

-- Create hire reviews table
CREATE TABLE public.hire_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES public.hire_listings(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  rating INT NOT NULL,
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Validation trigger for rating
CREATE OR REPLACE FUNCTION public.validate_hire_review_rating()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.rating < 1 OR NEW.rating > 5 THEN
    RAISE EXCEPTION 'rating must be between 1 and 5';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_hire_review
BEFORE INSERT OR UPDATE ON public.hire_reviews
FOR EACH ROW EXECUTE FUNCTION public.validate_hire_review_rating();

-- Create hire records table
CREATE TABLE public.hire_hires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES public.hire_listings(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  status TEXT DEFAULT 'active',
  hired_at TIMESTAMPTZ DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.validate_hire_status()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status NOT IN ('active', 'paused', 'cancelled') THEN
    RAISE EXCEPTION 'status must be active, paused, or cancelled';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_hire_status
BEFORE INSERT OR UPDATE ON public.hire_hires
FOR EACH ROW EXECUTE FUNCTION public.validate_hire_status();

-- RLS
ALTER TABLE public.hire_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hire_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hire_hires ENABLE ROW LEVEL SECURITY;

-- Public read for listings
CREATE POLICY "Anyone can view hire listings" ON public.hire_listings FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create listings" ON public.hire_listings FOR INSERT TO authenticated WITH CHECK (creator_id = auth.uid());

-- Public read for reviews
CREATE POLICY "Anyone can view reviews" ON public.hire_reviews FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create reviews" ON public.hire_reviews FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Hires visible to owner
CREATE POLICY "Users can view own hires" ON public.hire_hires FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can create hires" ON public.hire_hires FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own hires" ON public.hire_hires FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- Indexes
CREATE INDEX idx_hire_listings_category ON public.hire_listings(category);
CREATE INDEX idx_hire_listings_featured ON public.hire_listings(is_featured) WHERE is_featured = true;
CREATE INDEX idx_hire_reviews_listing ON public.hire_reviews(listing_id);
CREATE INDEX idx_hire_hires_listing ON public.hire_hires(listing_id);
CREATE INDEX idx_hire_hires_user ON public.hire_hires(user_id);
