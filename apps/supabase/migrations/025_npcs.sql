/**
 * Migration: NPCs
 *
 * AI-driven persistent NPCs and companions for the DreamRealm ecosystem.
 * Each NPC has a role, personality traits, backstory, and system prompt
 * for driving AI-powered conversations.
 */

CREATE TABLE npcs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE CHECK (char_length(slug) BETWEEN 1 AND 100),
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
  role TEXT NOT NULL DEFAULT 'guide' CHECK (role IN ('guide', 'merchant', 'quest_giver', 'guardian', 'storyteller', 'companion', 'moderator', 'healer')),
  avatar_url TEXT NULL CHECK (char_length(avatar_url) <= 2048),
  description TEXT NULL CHECK (char_length(description) <= 2000),
  personality_traits TEXT[] NOT NULL DEFAULT '{}',
  backstory TEXT NULL CHECK (char_length(backstory) <= 5000),
  greeting_message TEXT NULL CHECK (char_length(greeting_message) <= 500),
  farewell_message TEXT NULL CHECK (char_length(farewell_message) <= 500),
  voice_style TEXT NULL CHECK (char_length(voice_style) <= 100),
  system_prompt TEXT NULL CHECK (char_length(system_prompt) <= 10000),
  model_config JSONB NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_public BOOLEAN NOT NULL DEFAULT true,
  realm_id UUID NULL REFERENCES realms(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE npcs IS 'AI NPCs with persistent personalities and roles';

-- Indexes
CREATE INDEX idx_npcs_role ON npcs(role);
CREATE INDEX idx_npcs_realm_id ON npcs(realm_id);
CREATE INDEX idx_npcs_is_active ON npcs(is_active);
CREATE INDEX idx_npcs_is_public ON npcs(is_public);

-- Triggers
CREATE OR REPLACE FUNCTION update_npcs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER npcs_updated_at
BEFORE UPDATE ON npcs
FOR EACH ROW EXECUTE FUNCTION update_npcs_updated_at();

-- Row Level Security
ALTER TABLE npcs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "npcs_select_all" ON npcs
FOR SELECT USING (is_public = true OR is_active = true);

CREATE POLICY "npcs_admin_all" ON npcs
FOR ALL USING (
  auth.role() = 'authenticated' AND
  EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' = 'admin')
);
