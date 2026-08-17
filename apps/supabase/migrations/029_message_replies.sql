-- 029_message_replies.sql
-- Phase 4.5: Social — Threaded message replies

CREATE TABLE public.message_replies (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
    reply_to_message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content text NOT NULL CHECK (char_length(content) <= 10000),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_message_replies_message ON public.message_replies(message_id);
CREATE INDEX idx_message_replies_reply_to ON public.message_replies(reply_to_message_id);
CREATE INDEX idx_message_replies_user ON public.message_replies(user_id);
CREATE INDEX idx_message_replies_created ON public.message_replies(created_at);

ALTER TABLE public.message_replies ENABLE ROW LEVEL SECURITY;

-- Members can read replies in their conversations
CREATE POLICY message_replies_read ON public.message_replies
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.messages m
            JOIN public.conversation_members cm ON cm.conversation_id = m.conversation_id
            WHERE m.id = message_replies.message_id
              AND cm.profile_id = (
                  SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1
              )
        )
    );

-- Users can insert their own replies
CREATE POLICY message_replies_insert ON public.message_replies
    FOR INSERT WITH CHECK (
        user_id = (
            SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1
        )
    );

-- Authors can update their own replies
CREATE POLICY message_replies_update ON public.message_replies
    FOR UPDATE USING (
        user_id = (
            SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1
        )
    );

-- Authors can delete their own replies
CREATE POLICY message_replies_delete ON public.message_replies
    FOR DELETE USING (
        user_id = (
            SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1
        )
    );
