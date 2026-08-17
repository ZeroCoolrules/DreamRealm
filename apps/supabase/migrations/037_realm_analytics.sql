-- 037_realm_analytics.sql
-- Phase 4.4: Realm Creation Engine — Daily analytics aggregates per realm

CREATE TABLE public.realm_analytics (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    realm_id uuid NOT NULL REFERENCES public.realms(id) ON DELETE CASCADE,
    date date NOT NULL,
    member_count integer NOT NULL DEFAULT 0 CHECK (member_count >= 0),
    message_count integer NOT NULL DEFAULT 0 CHECK (message_count >= 0),
    activity_score integer NOT NULL DEFAULT 0 CHECK (activity_score >= 0),
    revenue_dream integer NOT NULL DEFAULT 0 CHECK (revenue_dream >= 0),
    top_events jsonb NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (realm_id, date)
);

COMMENT ON TABLE public.realm_analytics IS 'Daily analytics snapshots per realm: membership, activity, messaging, and revenue metrics';

-- Indexes
CREATE INDEX idx_realm_analytics_realm ON public.realm_analytics(realm_id);
CREATE INDEX idx_realm_analytics_date ON public.realm_analytics(date DESC);
CREATE INDEX idx_realm_analytics_realm_date ON public.realm_analytics(realm_id, date DESC);
CREATE INDEX idx_realm_analytics_activity ON public.realm_analytics(activity_score DESC);

-- updated_at trigger
CREATE TRIGGER realm_analytics_updated_at
    BEFORE UPDATE ON public.realm_analytics
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Row Level Security
ALTER TABLE public.realm_analytics ENABLE ROW LEVEL SECURITY;

-- Realm owners and admins can view analytics for their realms
CREATE POLICY realm_analytics_select ON public.realm_analytics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.realm_permissions rp
            WHERE rp.realm_id = realm_analytics.realm_id
              AND rp.user_id = auth.uid()
              AND rp.role IN ('owner', 'admin')
        )
    );

-- Only platform service role or admins can insert/update analytics
CREATE POLICY realm_analytics_insert_admin ON public.realm_analytics
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = auth.uid()
              AND raw_user_meta_data->>'role' = 'admin'
        )
    );

CREATE POLICY realm_analytics_update_admin ON public.realm_analytics
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = auth.uid()
              AND raw_user_meta_data->>'role' = 'admin'
        )
    );
