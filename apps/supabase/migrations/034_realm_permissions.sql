-- 034_realm_permissions.sql
-- Phase 4.4: Realm Creation Engine — Role-based permissions for realm members

CREATE TYPE realm_member_role AS ENUM (
    'owner',
    'admin',
    'moderator',
    'member',
    'banned'
);

CREATE TABLE public.realm_permissions (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    realm_id uuid NOT NULL REFERENCES public.realms(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role realm_member_role NOT NULL DEFAULT 'member',
    permissions jsonb NULL,
    joined_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (realm_id, user_id)
);

COMMENT ON TABLE public.realm_permissions IS 'Role-based access control for realm members including owners, admins, moderators, and banned users';

-- Indexes
CREATE INDEX idx_realm_permissions_realm ON public.realm_permissions(realm_id);
CREATE INDEX idx_realm_permissions_user ON public.realm_permissions(user_id);
CREATE INDEX idx_realm_permissions_role ON public.realm_permissions(role);
CREATE INDEX idx_realm_permissions_realm_role ON public.realm_permissions(realm_id, role);

-- updated_at trigger
CREATE TRIGGER realm_permissions_updated_at
    BEFORE UPDATE ON public.realm_permissions
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Row Level Security
ALTER TABLE public.realm_permissions ENABLE ROW LEVEL SECURITY;

-- Users can see their own permission rows
CREATE POLICY realm_permissions_select_own ON public.realm_permissions
    FOR SELECT USING (user_id = auth.uid());

-- Realm owners and admins can see all permissions for their realms
CREATE POLICY realm_permissions_select_admin ON public.realm_permissions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.realm_permissions rp
            WHERE rp.realm_id = realm_permissions.realm_id
              AND rp.user_id = auth.uid()
              AND rp.role IN ('owner', 'admin')
        )
    );

-- Users can insert their own member record
CREATE POLICY realm_permissions_insert_own ON public.realm_permissions
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND role = 'member'
    );

-- Admins and owners can manage all roles in their realm
CREATE POLICY realm_permissions_update_admin ON public.realm_permissions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.realm_permissions rp
            WHERE rp.realm_id = realm_permissions.realm_id
              AND rp.user_id = auth.uid()
              AND rp.role IN ('owner', 'admin')
        )
    );

-- Admins and owners can remove members
CREATE POLICY realm_permissions_delete_admin ON public.realm_permissions
    FOR DELETE USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.realm_permissions rp
            WHERE rp.realm_id = realm_permissions.realm_id
              AND rp.user_id = auth.uid()
              AND rp.role IN ('owner', 'admin')
        )
    );

-- Platform admins have full access
CREATE POLICY realm_permissions_admin_all ON public.realm_permissions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = auth.uid()
              AND raw_user_meta_data->>'role' = 'admin'
        )
    );
