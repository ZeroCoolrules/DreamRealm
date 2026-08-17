-- 031_announcements.sql
-- Phase 4.5: Social — Platform and realm announcements

CREATE TYPE announcement_priority AS ENUM ('low', 'normal', 'high', 'urgent');

CREATE TABLE public.announcements (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    realm_id uuid REFERENCES public.realms(id) ON DELETE CASCADE,
    title varchar(200) NOT NULL,
    body text NOT NULL,
    priority announcement_priority NOT NULL DEFAULT 'normal',
    is_pinned boolean NOT NULL DEFAULT false,
    starts_at timestamptz,
    expires_at timestamptz,
    created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_announcements_realm ON public.announcements(realm_id);
CREATE INDEX idx_announcements_created_by ON public.announcements(created_by);
CREATE INDEX idx_announcements_priority ON public.announcements(priority);
CREATE INDEX idx_announcements_pinned ON public.announcements(is_pinned) WHERE is_pinned = true;
CREATE INDEX idx_announcements_active ON public.announcements(starts_at, expires_at);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read active announcements
CREATE POLICY announcements_read ON public.announcements
    FOR SELECT USING (
        auth.uid() IS NOT NULL
        AND (starts_at IS NULL OR starts_at <= now())
        AND (expires_at IS NULL OR expires_at > now())
    );

-- Creators can update their own announcements
CREATE POLICY announcements_update ON public.announcements
    FOR UPDATE USING (
        created_by = (
            SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1
        )
    );

-- Creators can delete their own announcements
CREATE POLICY announcements_delete ON public.announcements
    FOR DELETE USING (
        created_by = (
            SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1
        )
    );

-- Authenticated users can create announcements (further scoped at app layer)
CREATE POLICY announcements_insert ON public.announcements
    FOR INSERT WITH CHECK (
        created_by = (
            SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1
        )
    );
