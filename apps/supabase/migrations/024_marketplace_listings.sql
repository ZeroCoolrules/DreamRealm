-- 024_marketplace_listings.sql
-- Phase 4.2 — Marketplace for digital goods, services, and premium content
-- Users list items; buyers purchase with DreamCoin.

CREATE TYPE listing_status AS ENUM ('draft', 'active', 'paused', 'sold', 'removed');

CREATE TYPE listing_category AS ENUM (
    'avatar_item',
    'avatar_frame',
    'title',
    'badge',
    'realm_pass',
    'premium_content',
    'commission',
    'digital_good',
    'subscription'
);

CREATE TABLE public.marketplace_listings (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    seller_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
    description text CHECK (char_length(description) <= 2000),
    category listing_category NOT NULL,
    price integer NOT NULL CHECK (price >= 0),
    currency text NOT NULL DEFAULT 'DREAM' CHECK (currency = 'DREAM'),
    stock integer NOT NULL DEFAULT 1 CHECK (stock >= 0),
    status listing_status NOT NULL DEFAULT 'draft',
    media_ids uuid[],                        -- references public.media (handled in app)
    metadata jsonb,                          -- category-specific fields
    sales_count integer NOT NULL DEFAULT 0,
    rating_avg numeric(3,2) DEFAULT 0 CHECK (rating_avg BETWEEN 0 AND 5),
    rating_count integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_marketplace_seller ON public.marketplace_listings(seller_id);
CREATE INDEX idx_marketplace_category ON public.marketplace_listings(category);
CREATE INDEX idx_marketplace_status ON public.marketplace_listings(status);
CREATE INDEX idx_marketplace_price ON public.marketplace_listings(price);

CREATE TRIGGER marketplace_listings_updated_at
    BEFORE UPDATE ON public.marketplace_listings
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.marketplace_listings ENABLE ROW LEVEL SECURITY;

-- Anyone can read active listings
CREATE POLICY marketplace_listings_public_read ON public.marketplace_listings
    FOR SELECT USING (status = 'active');

-- Sellers can manage their own listings
CREATE POLICY marketplace_listings_seller_all ON public.marketplace_listings
    FOR ALL USING (auth.uid() = seller_id);

-- Admins can manage all
CREATE POLICY marketplace_listings_admin_all ON public.marketplace_listings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid() AND u.role IN ('admin', 'moderator', 'system')
        )
    );

-- Purchases / order records
CREATE TABLE public.marketplace_purchases (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    buyer_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    listing_id uuid NOT NULL REFERENCES public.marketplace_listings(id) ON DELETE CASCADE,
    seller_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    price_paid integer NOT NULL CHECK (price_paid >= 0),
    quantity integer NOT NULL DEFAULT 1 CHECK (quantity >= 1),
    status text NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'refunded', 'disputed')),
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_marketplace_purchases_buyer ON public.marketplace_purchases(buyer_id);
CREATE INDEX idx_marketplace_purchases_seller ON public.marketplace_purchases(seller_id);

ALTER TABLE public.marketplace_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY marketplace_purchases_buyer_read ON public.marketplace_purchases
    FOR SELECT USING (auth.uid() = buyer_id);

CREATE POLICY marketplace_purchases_seller_read ON public.marketplace_purchases
    FOR SELECT USING (auth.uid() = seller_id);

CREATE POLICY marketplace_purchases_admin_all ON public.marketplace_purchases
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid() AND u.role IN ('admin', 'system')
        )
    );
