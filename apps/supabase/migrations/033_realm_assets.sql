-- 033_realm_assets.sql
-- Phase 4.4: Realm Creation Engine — Asset management for realms

CREATE TYPE realm_asset_type AS ENUM (
    'image',
    'video',
    'audio',
    'model',
    'script',
    'spawn_point',
    'voice_zone'
);

CREATE TABLE public.realm_assets (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    realm_id uuid NOT NULL REFERENCES public.realms(id) ON DELETE CASCADE,
    asset_type realm_asset_type NOT NULL,
    url text NOT NULL,
    thumbnail_url text NULL,
    metadata jsonb NULL,
    sort_order integer NOT NULL DEFAULT 0,
    created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.realm_assets IS 'Assets (images, videos, models, scripts, zones) associated with a realm';

-- Indexes
CREATE INDEX idx_realm_assets_realm ON public.realm_assets(realm_id);
CREATE INDEX idx_realm_assets_type ON public.realm_assets(asset_type);
CREATE INDEX idx_realm_assets_sort ON public.realm_assets(realm_id, sort_order);
CREATE INDEX idx_realm_assets_created_by ON public.realm_assets(created_by);

-- updated_at trigger
CREATE TRIGGER realm_assets_updated_at
    BEFORE UPDATE ON public.realm_assets
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Row Level Security
ALTER TABLE public.realm_assets ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can view assets of public realms
CREATE POLICY realm_assets_select ON public.realm_assets
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Asset creators can insert their own assets
CREATE POLICY realm_assets_insert ON public.realm_assets
    FOR INSERT WITH CHECK (created_by = auth.uid());

-- Creators can update their own assets
CREATE POLICY realm_assets_update ON public.realm_assets
    FOR UPDATE USING (created_by = auth.uid());

-- Creators can delete their own assets
CREATE POLICY realm_assets_delete ON public.realm_assets
    FOR DELETE USING (created_by = auth.uid());

-- Admins have full access
CREATE POLICY realm_assets_admin ON public.realm_assets
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = auth.uid()
              AND raw_user_meta_data->>'role' = 'admin'
        )
    );
