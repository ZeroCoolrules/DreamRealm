-- 023_creator_payouts.sql
-- Phase 4.2 — Creator payout system for DreamCoin economy
-- Tracks earnings, payout requests, and payment processor state.

CREATE TYPE payout_status AS ENUM ('pending', 'processing', 'paid', 'rejected', 'cancelled');

CREATE TYPE payout_method AS ENUM ('bank_transfer', 'crypto_wallet', 'paypal', 'stripe');

CREATE TABLE public.creator_payouts (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    amount integer NOT NULL CHECK (amount > 0),
    status payout_status NOT NULL DEFAULT 'pending',
    method payout_method,
    method_details jsonb,           -- e.g. { "account_last4": "4242", "routing_hash": "abc123" }
    processor_reference text,
    requested_at timestamptz NOT NULL DEFAULT now(),
    processed_at timestamptz,
    rejected_reason text CHECK (char_length(rejected_reason) <= 500),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_creator_payouts_user ON public.creator_payouts(user_id);
CREATE INDEX idx_creator_payouts_status ON public.creator_payouts(status);
CREATE INDEX idx_creator_payouts_requested ON public.creator_payouts(requested_at);

CREATE TRIGGER creator_payouts_updated_at
    BEFORE UPDATE ON public.creator_payouts
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.creator_payouts ENABLE ROW LEVEL SECURITY;

-- Users can read their own payouts
CREATE POLICY creator_payouts_self_read ON public.creator_payouts
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own payout requests
CREATE POLICY creator_payouts_self_insert ON public.creator_payouts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admin full access
CREATE POLICY creator_payouts_admin_all ON public.creator_payouts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid() AND u.role IN ('admin', 'system')
        )
    );
