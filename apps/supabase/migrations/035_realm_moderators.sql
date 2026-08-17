-- 035_realm_moderators.sql
-- Phase 4.4: Realm Creation Engine — Dedicated moderator assignments for realms

CREATE TABLE public.realm_moderators (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    realm_id uuid NOT NULL REFERENCES public.realms(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    moderator_notes text NULL,
    is_active boolean NOT NULL DEFAULT true,
    assigned_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (realm_id, user_id)
);

COMMENT ON TABLE public.realm_moderators IS 'Dedicated moderator assignments for realms with activity tracking';

-- Indexes
CREATE INDEX idx_realm_moderators_realm ON public.realm_moderators(realm_id);
CREATE INDEX idx_realm_moderators_user ON public.realm_moderators(user_id);
CREATE INDEX idx_realm_moderators_active ON public.realm_moderators(realm_id, is_active) WHERE is_active = true;
CREATE INDEX idx_realm_moderators_assigned_by ON public.realm_moderators(assigned_by);

-- updated_at trigger
CREATE TRIGGER realm_moderators_updated_at
    BEFORE UPDATE ON public.realm_moderators
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Row Level Security
ALTER TABLE public.realm_moderators ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can see active moderators (for display purposes)
CREATE POLICY realm_moderators_select ON public.realm_moderators
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Realm owners and admins can assign moderators
CREATE POLICY realm_moderators_insert ON public.realm_moderators
    FOR INSERT WITH CHECK (
        assigned_by = auth.uid() AND
        EXISTS (
            SELECT 1 FROM public.realm_permissions rp
            WHERE rp.realm_id = realm_moderators.realm_id
              AND rp.user_id = auth.uid()
              AND rp.role IN ('owner', 'admin')
        )
    );

-- Owners and admins can update moderator records
CREATE POLICY realm_moderators_update ON public.realm_moderators
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.realm_permissions rp
            WHERE rp.realm_id = realm_moderators.realm_id
              AND rp.user_id = auth.uid()
              AND rp.role IN ('owner', 'admin')
        )
    );

-- Owners and admins can remove moderators
CREATE POLICY realm_moderators_delete ON public.realm_moderators
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.realm_permissions rp
            WHERE rp.realm_id = realm_moderators.realm_id
              AND rp.user_id = auth.uid()
              AND rp.role IN ('owner', 'admin')
        )
    );

-- Platform admins have full access
CREATE POLICY realm_moderators_admin_all ON public.realm_moderators
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = auth.uid()
              AND raw_user_meta_data->>'role' = 'admin'
        )
    );
