-- 028_message_reactions.sql
-- Phase 4.5: Social — Emoji reactions on messages

CREATE TABLE public.message_reactions (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reaction_type varchar(50) NOT NULL DEFAULT 'emoji',
    emoji varchar(10) NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),

    -- One reaction per emoji per user per message
    CONSTRAINT unique_user_message_emoji UNIQUE (message_id, user_id, emoji)
);

CREATE INDEX idx_message_reactions_message ON public.message_reactions(message_id);
CREATE INDEX idx_message_reactions_user ON public.message_reactions(user_id);

ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

-- All conversation members can read reactions
CREATE POLICY message_reactions_read ON public.message_reactions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.messages m
            JOIN public.conversation_members cm ON cm.conversation_id = m.conversation_id
            WHERE m.id = message_reactions.message_id
              AND cm.profile_id = (
                  SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1
              )
        )
    );

-- Users can insert their own reactions
CREATE POLICY message_reactions_insert ON public.message_reactions
    FOR INSERT WITH CHECK (
        user_id = (
            SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1
        )
    );

-- Users can delete their own reactions
CREATE POLICY message_reactions_delete ON public.message_reactions
    FOR DELETE USING (
        user_id = (
            SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1
        )
    );
