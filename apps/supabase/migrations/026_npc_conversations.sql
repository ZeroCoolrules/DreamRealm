/**
 * Migration: NPC Conversations & Memories
 *
 * Persistent conversation logs and memory system for AI NPCs.
 * Uses pgvector extension for semantic memory embeddings.
 */

-- Enable pgvector for semantic memory
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE npc_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  npc_id UUID NOT NULL REFERENCES npcs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  memory_type TEXT NOT NULL DEFAULT 'fact' CHECK (memory_type IN ('fact', 'preference', 'event', 'emotion', 'goal')),
  content TEXT NOT NULL CHECK (char_length(content) <= 2000),
  importance INTEGER NOT NULL DEFAULT 5 CHECK (importance BETWEEN 1 AND 10),
  embedding VECTOR(1536) NULL,
  expires_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE npc_memories IS 'Semantic memory store for AI NPCs per user';

CREATE INDEX idx_npc_memories_npc_id ON npc_memories(npc_id);
CREATE INDEX idx_npc_memories_user_id ON npc_memories(user_id);
CREATE INDEX idx_npc_memories_type ON npc_memories(memory_type);
CREATE INDEX idx_npc_memories_expires ON npc_memories(expires_at) WHERE expires_at IS NOT NULL;

-- HNSW index for fast vector search (pgvector)
CREATE INDEX idx_npc_memories_embedding ON npc_memories USING hnsw (embedding vector_cosine_ops);

-- Row Level Security
ALTER TABLE npc_memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "npc_memories_select_own" ON npc_memories
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "npc_memories_insert_own" ON npc_memories
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "npc_memories_delete_own" ON npc_memories
FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "npc_memories_admin_all" ON npc_memories
FOR ALL USING (
  auth.role() = 'authenticated' AND
  EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' = 'admin')
);


CREATE TABLE npc_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  npc_id UUID NOT NULL REFERENCES npcs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL CHECK (char_length(message) <= 10000),
  is_from_npc BOOLEAN NOT NULL DEFAULT false,
  model_used TEXT NULL CHECK (char_length(model_used) <= 100),
  latency_ms INTEGER NULL CHECK (latency_ms >= 0),
  tokens_used INTEGER NULL CHECK (tokens_used >= 0),
  metadata JSONB NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE npc_conversations IS 'Conversation history between users and AI NPCs';

CREATE INDEX idx_npc_conversations_npc_user ON npc_conversations(npc_id, user_id);
CREATE INDEX idx_npc_conversations_created ON npc_conversations(created_at DESC);

-- Row Level Security
ALTER TABLE npc_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "npc_conversations_select_own" ON npc_conversations
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "npc_conversations_insert_own" ON npc_conversations
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "npc_conversations_delete_own" ON npc_conversations
FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "npc_conversations_admin_all" ON npc_conversations
FOR ALL USING (
  auth.role() = 'authenticated' AND
  EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' = 'admin')
);
