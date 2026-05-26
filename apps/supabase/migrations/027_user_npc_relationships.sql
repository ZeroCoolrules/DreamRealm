/**
 * Migration: User-NPC Relationships
 *
 * Tracks affinity, trust, and interaction history between users and NPCs.
 * Enables romantic companion assignments and persistent social dynamics.
 */

CREATE TABLE user_npc_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  npc_id UUID NOT NULL REFERENCES npcs(id) ON DELETE CASCADE,
  affinity_score INTEGER NOT NULL DEFAULT 0 CHECK (affinity_score BETWEEN -100 AND 100),
  trust_level INTEGER NOT NULL DEFAULT 0 CHECK (trust_level BETWEEN 0 AND 100),
  interaction_count INTEGER NOT NULL DEFAULT 0 CHECK (interaction_count >= 0),
  last_interaction_at TIMESTAMPTZ NULL,
  favorite BOOLEAN NOT NULL DEFAULT false,
  blocked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, npc_id)
);

COMMENT ON TABLE user_npc_relationships IS 'Social dynamics and companion bonding between users and NPCs';

CREATE INDEX idx_user_npc_relationships_user ON user_npc_relationships(user_id);
CREATE INDEX idx_user_npc_relationships_npc ON user_npc_relationships(npc_id);
CREATE INDEX idx_user_npc_relationships_favorite ON user_npc_relationships(favorite) WHERE favorite = true;
CREATE INDEX idx_user_npc_relationships_affinity ON user_npc_relationships(affinity_score DESC);

-- Trigger for updated_at
CREATE TRIGGER user_npc_relationships_updated_at
BEFORE UPDATE ON user_npc_relationships
FOR EACH ROW EXECUTE FUNCTION update_npcs_updated_at();

-- Row Level Security
ALTER TABLE user_npc_relationships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_npc_relationships_select_own" ON user_npc_relationships
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "user_npc_relationships_insert_own" ON user_npc_relationships
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_npc_relationships_update_own" ON user_npc_relationships
FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "user_npc_relationships_delete_own" ON user_npc_relationships
FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "user_npc_relationships_admin_all" ON user_npc_relationships
FOR ALL USING (
  auth.role() = 'authenticated' AND
  EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' = 'admin')
);
