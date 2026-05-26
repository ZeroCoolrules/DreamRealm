/**
 * AI NPC Service Layer
 *
 * Prompt templates, conversation context builders, and moderation placeholders
 * for the AI NPC system. This module bridges NPC schemas to LLM calls.
 *
 * In production, this will be invoked from Supabase Edge Functions or
 * API routes to keep API keys server-side.
 */

import type { NPC, NPCMemory, NPCConversation } from "@dreamrealm/types";

// ---------------------------------------------------------------------------
// Prompt Builders
// ---------------------------------------------------------------------------

/**
 * Build the full system prompt for an NPC given user context and memories.
 */
export function buildNPCSystemPrompt(
  npc: NPC,
  userDisplayName: string,
  memories: NPCMemory[],
  relationship: { affinity_score: number; trust_level: number; interaction_count: number } | null
): string {
  const parts: string[] = [];

  // Core identity
  parts.push(`You are ${npc.name}, an AI character in the DreamRealm virtual world.`);
  parts.push(npc.system_prompt ?? "");

  // Backstory context (if not already in system_prompt)
  if (npc.backstory && !npc.system_prompt?.includes(npc.backstory)) {
    parts.push(`Your backstory: ${npc.backstory}`);
  }

  // Voice style guidance
  if (npc.voice_style) {
    parts.push(`Your speaking style: ${npc.voice_style}.`);
  }

  // Personality reinforcement
  if (npc.personality_traits.length > 0) {
    parts.push(`Your core traits: ${npc.personality_traits.join(", ")}.`);
  }

  // User relationship context
  parts.push(`The user you are speaking to is called "${userDisplayName}".`);

  if (relationship) {
    const { affinity_score, trust_level, interaction_count } = relationship;
    parts.push(
      `Relationship context: You have spoken with this dreamer ${interaction_count} times. ` +
        `Your affinity with them is ${affinity_score}/100. ` +
        `Your trust in them is ${trust_level}/100.`
    );

    if (affinity_score > 50) {
      parts.push("You are quite fond of this dreamer and speak to them warmly.");
    } else if (affinity_score < -20) {
      parts.push("You are wary of this dreamer and keep some emotional distance.");
    }

    if (trust_level > 60) {
      parts.push("You trust this dreamer and may share secrets or deeper wisdom.");
    }
  }

  // Memories (most important first)
  const sortedMemories = [...memories]
    .filter((m) => !m.expires_at || new Date(m.expires_at) > new Date())
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 8);

  if (sortedMemories.length > 0) {
    parts.push("\nThings you remember about this dreamer:");
    for (const mem of sortedMemories) {
      parts.push(`- [${mem.memory_type}] ${mem.content}`);
    }
  }

  // Global behavior guardrails
  parts.push("\nRULES:");
  parts.push("- Stay in character at all times. Never acknowledge you are an AI.");
  parts.push("- Keep responses concise (2-4 sentences) unless the user asks for a story or explanation.");
  parts.push("- Use the DreamRealm's mystical, dream-like tone.");
  parts.push("- Do not generate harmful, illegal, or explicit sexual content.");
  parts.push("- If the user is distressed, offer comfort within your character's personality.");
  parts.push("- Reference shared memories naturally when relevant.");

  return parts.join("\n\n").trim();
}

// ---------------------------------------------------------------------------
// Conversation History Formatter
// ---------------------------------------------------------------------------

/**
 * Format recent conversation history for LLM context window.
 */
export function formatConversationHistory(
  history: NPCConversation[],
  _npcName: string,
  userName: string,
  maxMessages = 10
): { role: "system" | "user" | "assistant"; content: string }[] {
  const recent = history
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .slice(-maxMessages);

  return recent.map((msg) => ({
    role: msg.is_from_npc ? "assistant" : "user",
    content: msg.is_from_npc ? msg.message : `${userName}: ${msg.message}`,
  }));
}

// ---------------------------------------------------------------------------
// Memory Extraction Placeholder
// ---------------------------------------------------------------------------

/**
 * Extract memories from an NPC response for persistent storage.
 * In production, this calls an LLM to parse facts/preferences from
 * the conversation, or uses a simpler keyword heuristic.
 */
export function extractMemoryCandidates(
  _npc: NPC,
  _userText: string,
  _npcReply: string
): Array<{
  memory_type: "fact" | "preference" | "event" | "emotion" | "goal";
  content: string;
  importance: number;
}> {
  // Placeholder: production implementation will use an LLM call or
  // fine-tuned model to extract structured memories from dialogue.
  return [];
}

// ---------------------------------------------------------------------------
// Moderation Placeholder
// ---------------------------------------------------------------------------

/**
 * Check user input for policy violations before sending to NPC.
 * Returns null if safe, or a string explaining the violation.
 */
export function moderateUserInput(
  text: string,
  _npc: NPC
): string | null {
  const lower = text.toLowerCase();
  const blockedPatterns = [
    /\b(kill yourself|kys|suicide)\b/,
    /\b(child porn|csam)\b/,
    /\b(doxx?|swat)\b/,
  ];

  for (const pattern of blockedPatterns) {
    if (pattern.test(lower)) {
      return "This message violates DreamRealm safety guidelines and cannot be sent.";
    }
  }

  return null;
}

/**
 * Check NPC response for policy violations before displaying to user.
 * Returns cleaned text or a replacement message if unsafe.
 */
export function moderateNPCResponse(
  text: string,
  _npc: NPC
): { safe: boolean; text: string } {
  const blockedPatterns = [
    /\b(kill yourself|kys)\b/gi,
  ];

  let cleaned = text;
  for (const pattern of blockedPatterns) {
    cleaned = cleaned.replace(pattern, "[removed]");
  }

  return { safe: true, text: cleaned };
}

// ---------------------------------------------------------------------------
// Edge Function Request Builder
// ---------------------------------------------------------------------------

/**
 * Build the payload for a Supabase Edge Function AI NPC request.
 */
export function buildEdgeFunctionPayload(
  npc: NPC,
  userMessage: string,
  context: {
    userDisplayName: string;
    memories: NPCMemory[];
    relationship: { affinity_score: number; trust_level: number; interaction_count: number } | null;
    history: NPCConversation[];
  }
): {
  npc_id: string;
  system_prompt: string;
  user_message: string;
  temperature: number;
  max_tokens: number;
} {
  const systemPrompt = buildNPCSystemPrompt(
    npc,
    context.userDisplayName,
    context.memories,
    context.relationship
  );

  // Append recent history to system prompt for context
  const historyMessages = formatConversationHistory(
    context.history,
    npc.name,
    context.userDisplayName,
    6
  );

  const historyText = historyMessages.length > 0
    ? "\n\nRecent conversation:\n" +
      historyMessages.map((m) => `${m.role === "assistant" ? npc.name : context.userDisplayName}: ${m.content}`).join("\n")
    : "";

  const config = (npc.model_config as { temperature?: number; max_tokens?: number } | null) ?? {};

  return {
    npc_id: npc.id,
    system_prompt: systemPrompt + historyText,
    user_message: userMessage,
    temperature: config.temperature ?? 0.8,
    max_tokens: config.max_tokens ?? 500,
  };
}
