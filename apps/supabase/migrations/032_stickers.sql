-- 032_stickers.sql
-- Phase 4.5: Social — Sticker catalog for messaging

CREATE TABLE public.stickers (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name varchar(100) NOT NULL,
    url text NOT NULL,
    category varchar(50) NOT NULL DEFAULT 'general',
    price_dream integer NOT NULL DEFAULT 0 CHECK (price_dream >= 0),
    is_premium boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_stickers_category ON public.stickers(category);
CREATE INDEX idx_stickers_premium ON public.stickers(is_premium);

ALTER TABLE public.stickers ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read stickers
CREATE POLICY stickers_read ON public.stickers
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Only admins can insert stickers (enforced via admin role check at app layer)
-- Using a function-based check for admin role
CREATE POLICY stickers_insert ON public.stickers
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = auth.uid()
              AND raw_user_meta_data->>'role' = 'admin'
        )
    );

CREATE POLICY stickers_update ON public.stickers
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = auth.uid()
              AND raw_user_meta_data->>'role' = 'admin'
        )
    );

CREATE POLICY stickers_delete ON public.stickers
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = auth.uid()
              AND raw_user_meta_data->>'role' = 'admin'
        )
    );
