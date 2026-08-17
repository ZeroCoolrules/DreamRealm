-- 030_group_chat_members.sql
-- Phase 4.5: Social — Extended group chat membership with roles

CREATE TYPE group_member_role AS ENUM ('owner', 'admin', 'member');

CREATE TABLE public.group_chat_members (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role group_member_role NOT NULL DEFAULT 'member',
    joined_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT unique_group_member UNIQUE (conversation_id, user_id)
);

CREATE INDEX idx_group_chat_members_conversation ON public.group_chat_members(conversation_id);
CREATE INDEX idx_group_chat_members_user ON public.group_chat_members(user_id);
CREATE INDEX idx_group_chat_members_role ON public.group_chat_members(role);

ALTER TABLE public.group_chat_members ENABLE ROW LEVEL SECURITY;

-- Members can read their group's member list
CREATE POLICY group_chat_members_read ON public.group_chat_members
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.group_chat_members gcm2
            WHERE gcm2.conversation_id = group_chat_members.conversation_id
              AND gcm2.user_id = (
                  SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1
              )
        )
    );

-- Users can insert themselves (joining)
CREATE POLICY group_chat_members_insert ON public.group_chat_members
    FOR INSERT WITH CHECK (
        user_id = (
            SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1
        )
    );

-- Admins/owners can update member roles (checked at app layer)
CREATE POLICY group_chat_members_update ON public.group_chat_members
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.group_chat_members gcm
            WHERE gcm.conversation_id = group_chat_members.conversation_id
              AND gcm.user_id = (
                  SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1
              )
              AND gcm.role IN ('owner', 'admin')
        )
    );

-- Members can remove themselves; owners/admins can remove others
CREATE POLICY group_chat_members_delete ON public.group_chat_members
    FOR DELETE USING (
        user_id = (
            SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1
        )
        OR
        EXISTS (
            SELECT 1 FROM public.group_chat_members gcm
            WHERE gcm.conversation_id = group_chat_members.conversation_id
              AND gcm.user_id = (
                  SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1
              )
              AND gcm.role IN ('owner', 'admin')
        )
    );
