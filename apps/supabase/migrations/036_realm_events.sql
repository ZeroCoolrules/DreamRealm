-- 036_realm_events.sql
-- Phase 4.4: Realm Creation Engine — Event log for realm activity

CREATE TYPE realm_event_type AS ENUM (
    'spawn_set',
    'zone_added',
    'object_placed',
    'script_triggered',
    'member_joined',
    'member_left',
    'announcement',
    'mini_game_started'
);

CREATE TABLE public.realm_events (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    realm_id uuid NOT NULL REFERENCES public.realms(id) ON DELETE CASCADE,
    event_type realm_event_type NOT NULL,
    payload jsonb NOT NULL DEFAULT '{}',
    triggered_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.realm_events IS 'Immutable event log for realm activity — spawns, joins, announcements, and mini-games';

-- Indexes
CREATE INDEX idx_realm_events_realm ON public.realm_events(realm_id);
CREATE INDEX idx_realm_events_type ON public.realm_events(event_type);
CREATE INDEX idx_realm_events_created_at ON public.realm_events(realm_id, created_at DESC);
CREATE INDEX idx_realm_events_triggered_by ON public.realm_events(triggered_by);

-- Row Level Security (no updated_at — events are immutable)
ALTER TABLE public.realm_events ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view realm events
CREATE POLICY realm_events_select ON public.realm_events
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Authenticated users can insert events (app layer enforces authorization)
CREATE POLICY realm_events_insert ON public.realm_events
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND
        (triggered_by IS NULL OR triggered_by = auth.uid())
    );

-- Events are immutable — no updates allowed
-- Delete restricted to platform admins only
CREATE POLICY realm_events_delete_admin ON public.realm_events
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = auth.uid()
              AND raw_user_meta_data->>'role' = 'admin'
        )
    );
