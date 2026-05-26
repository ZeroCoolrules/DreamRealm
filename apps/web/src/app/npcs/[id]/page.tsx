/**
 * NPC Chat Interface
 *
 * Interactive chat with an AI NPC. Displays message history, typing indicators,
 * mood, affinity/trust tracking, backstory, simulated AI responses, localStorage
 * persistence, memory references, suggestion chips, relationship stats, and export.
 */

"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import AppShell from "../../components/AppShell";
import { getNPCBySlug, getMoodEmoji, getRoleStyle, getRoleLabel } from "../../lib/npcs";
import type { NPCRole } from "@dreamrealm/types";

interface ChatMessage {
  id: string;
  text: string;
  isNPC: boolean;
  timestamp: string;
}

interface StoredSession {
  messages: ChatMessage[];
  affinity: number;
  trust: number;
  startedAt: string;
  lastUpdated: string;
  memorySnippets: string[];
}

function storageKey(slug: string): string {
  return `npc_chat_${slug}`;
}

function loadSession(slug: string): StoredSession | null {
  try {
    const raw = localStorage.getItem(storageKey(slug));
    if (!raw) return null;
    return JSON.parse(raw) as StoredSession;
  } catch {
    return null;
  }
}

function saveSession(slug: string, session: StoredSession) {
  try {
    localStorage.setItem(storageKey(slug), JSON.stringify(session));
  } catch {
    // storage full — silently drop
  }
}

function extractTopics(text: string): string[] {
  const topics: string[] = [];
  const lower = text.toLowerCase();
  const keywordMap: Record<string, string[]> = {
    stars: ["stars", "constellation", "sky", "starlight", "galaxy"],
    quests: ["quest", "trial", "challenge", "adventure", "mission"],
    market: ["buy", "sell", "coin", "price", "bazaar", "shop", "trade"],
    stories: ["story", "tale", "legend", "narrative", "book"],
    love: ["love", "heart", "romance", "crush", "feelings"],
    danger: ["danger", "shadow", "threat", "monster", "enemy"],
    realms: ["realm", "world", "dimension", "dreamscape", "plane"],
    memories: ["memory", "remember", "past", "recall", "forgotten"],
  };
  for (const [topic, keywords] of Object.entries(keywordMap)) {
    if (keywords.some((k) => lower.includes(k))) {
      topics.push(topic);
    }
  }
  return [...new Set(topics)];
}

function formatDuration(start: string): string {
  const diff = Date.now() - new Date(start).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  return `${m}m`;
}

function getSuggestionChips(role: NPCRole): string[] {
  const chips: Record<NPCRole, string[]> = {
    guide: ["Where should I explore?", "Tell me about the realms", "I'm lost — help me"],
    merchant: ["What do you sell?", "Any deals today?", "Tell me about the Bazaar"],
    quest_giver: ["Do you have a quest?", "How do I get stronger?", "What trials await?"],
    guardian: ["Is the realm safe?", "What dangers lurk?", "How do I protect myself?"],
    storyteller: ["Tell me a story", "What's the oldest legend?", "I have a tale for you"],
    companion: ["How are you feeling?", "I need someone to talk to", "Tell me a secret"],
    moderator: ["What are the rules?", "How do I report someone?", "Community guidelines"],
    healer: ["I'm feeling drained", "How do I recover?", "What heals the soul?"],
  };
  return chips[role] ?? ["Hello", "Tell me about yourself", "What can you do?"];
}

export default function NPCChatPage() {
  const params = useParams();
  const slug = typeof params.id === "string" ? params.id : "";
  const npc = getNPCBySlug(slug);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showBackstory, setShowBackstory] = useState(false);
  const [showSystemPrompt, setShowSystemPrompt] = useState(false);
  const [showRelationship, setShowRelationship] = useState(false);
  const [affinity, setAffinity] = useState(12);
  const [trust, setTrust] = useState(8);
  const [sessionStartedAt, setSessionStartedAt] = useState<string>(new Date().toISOString());
  const [memorySnippets, setMemorySnippets] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load persisted session on mount
  useEffect(() => {
    if (!npc) return;
    const stored = loadSession(npc.slug);
    if (stored) {
      setMessages(stored.messages);
      setAffinity(stored.affinity);
      setTrust(stored.trust);
      setSessionStartedAt(stored.startedAt);
      setMemorySnippets(stored.memorySnippets ?? []);
    } else if (npc.greeting_message) {
      const greeting: ChatMessage = {
        id: "greet",
        text: npc.greeting_message,
        isNPC: true,
        timestamp: new Date().toISOString(),
      };
      setMessages([greeting]);
      setMemorySnippets([]);
      saveSession(npc.slug, {
        messages: [greeting],
        affinity: 12,
        trust: 8,
        startedAt: sessionStartedAt,
        lastUpdated: new Date().toISOString(),
        memorySnippets: [],
      });
    }
  }, [npc, sessionStartedAt]);

  // Persist on every change
  useEffect(() => {
    if (!npc || messages.length === 0) return;
    saveSession(npc.slug, {
      messages,
      affinity,
      trust,
      startedAt: sessionStartedAt,
      lastUpdated: new Date().toISOString(),
      memorySnippets,
    });
  }, [messages, affinity, trust, memorySnippets, npc, sessionStartedAt]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSend = useCallback(async (textOverride?: string) => {
    const text = (textOverride ?? input).trim();
    if (!text || isTyping || !npc) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      text,
      isNPC: false,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    // Extract topics for memory
    const newTopics = extractTopics(text);
    if (newTopics.length > 0) {
      setMemorySnippets((prev) => {
        const merged = [...prev, ...newTopics];
        return merged.slice(-6);
      });
    }

    // Simulate AI latency
    await new Promise((r) => setTimeout(r, 1200 + Math.random() * 1500));

    const npcReply = generateNPCReply(npc, text, messages, affinity, trust, memorySnippets);
    const npcMsg: ChatMessage = {
      id: `n-${Date.now()}`,
      text: npcReply,
      isNPC: true,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, npcMsg]);
    setIsTyping(false);
    setAffinity((a) => Math.min(100, a + Math.floor(Math.random() * 3) + 1));
    setTrust((t) => Math.min(100, t + Math.floor(Math.random() * 2) + 1));
  }, [input, isTyping, npc, messages, affinity, trust, memorySnippets]);

  if (!npc) {
    return (
      <AppShell>
        <div className="mx-auto max-w-3xl px-4 py-8 text-center">
          <p className="mb-2 text-lg">👻</p>
          <h1 className="mb-2 text-xl font-bold text-text">Companion Not Found</h1>
          <p className="mb-6 text-sm text-text-muted">This spirit has faded from the DreamRealm.</p>
          <Link
            href="/npcs"
            className="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-glow transition hover:bg-primary-dark"
          >
            Back to Companions
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-4 py-6">
        {/* Header */}
        <div className="mb-4 flex items-start gap-4 rounded-2xl border border-border bg-surface p-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 border-primary/20 bg-primary/10 text-3xl shadow-glow">
            {getMoodEmoji(npc.mood)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-2">
              <h1 className="text-lg font-bold text-text">{npc.name}</h1>
              <span className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${getRoleStyle(npc.role)}`}>
                {getRoleLabel(npc.role)}
              </span>
            </div>
            <p className="mb-2 text-xs text-text-muted line-clamp-2">{npc.description}</p>

            {/* Affinity / Trust */}
            <div className="flex gap-4">
              <StatBar label="Affinity" value={affinity} color="bg-pink-500" />
              <StatBar label="Trust" value={trust} color="bg-blue-500" />
            </div>
          </div>
        </div>

        {/* Toggles */}
        <div className="mb-4 flex flex-wrap gap-2">
          <button
            onClick={() => setShowBackstory((s) => !s)}
            className="rounded-lg border border-border bg-surface-light px-3 py-1.5 text-xs text-text-muted transition hover:text-text"
          >
            {showBackstory ? "Hide" : "Show"} Backstory
          </button>
          <button
            onClick={() => setShowSystemPrompt((s) => !s)}
            className="rounded-lg border border-border bg-surface-light px-3 py-1.5 text-xs text-text-muted transition hover:text-text"
          >
            {showSystemPrompt ? "Hide" : "Show"} Personality Core
          </button>
          <button
            onClick={() => setShowRelationship((s) => !s)}
            className="rounded-lg border border-border bg-surface-light px-3 py-1.5 text-xs text-text-muted transition hover:text-text"
          >
            {showRelationship ? "Hide" : "Show"} Relationship
          </button>
        </div>

        {showBackstory && (
          <div className="mb-4 rounded-2xl border border-border bg-surface p-4">
            <h3 className="mb-1 text-xs font-bold uppercase tracking-wider text-text-muted">Backstory</h3>
            <p className="text-sm leading-relaxed text-text-muted">{npc.backstory}</p>
          </div>
        )}

        {showSystemPrompt && (
          <div className="mb-4 rounded-2xl border border-border bg-surface p-4">
            <h3 className="mb-1 text-xs font-bold uppercase tracking-wider text-text-muted">Personality Core</h3>
            <p className="text-sm leading-relaxed text-text-muted">{npc.system_prompt}</p>
          </div>
        )}

        {showRelationship && (
          <div className="mb-4 rounded-2xl border border-border bg-surface p-4">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-text-muted">Relationship Timeline</h3>
            <div className="mb-3 flex gap-4">
              <StatBar label="Affinity" value={affinity} color="bg-pink-500" />
              <StatBar label="Trust" value={trust} color="bg-blue-500" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-lg bg-surface-light px-3 py-2 text-xs text-text-muted">
                <span>Session started</span>
                <span>{new Date(sessionStartedAt).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-surface-light px-3 py-2 text-xs text-muted">
                <span>Messages exchanged</span>
                <span>{messages.length}</span>
              </div>
              {memorySnippets.length > 0 && (
                <div className="rounded-lg bg-surface-light px-3 py-2">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">Remembered topics</p>
                  <div className="flex flex-wrap gap-1">
                    {memorySnippets.map((m, i) => (
                      <span key={`${m}-${i}`} className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">{m}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Chat area */}
        <div
          ref={scrollRef}
          className="mb-4 max-h-[50vh] overflow-y-auto rounded-2xl border border-border bg-surface p-4"
        >
          {messages.length === 0 && (
            <p className="py-8 text-center text-sm text-text-muted">Say hello to {npc.name}...</p>
          )}

          <div className="space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.isNPC ? "justify-start" : "justify-end"}`}
              >
                <div
                  className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                    msg.isNPC
                      ? "border border-border bg-surface-light text-text"
                      : "bg-primary text-white"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1 rounded-xl border border-border bg-surface-light px-3 py-2">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-muted" style={{ animationDelay: "0ms" }} />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-muted" style={{ animationDelay: "150ms" }} />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-muted" style={{ animationDelay: "300ms" }} />
                  <span className="ml-1 text-[10px] text-text-muted">{npc.name} is thinking...</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Suggestion chips */}
        <div className="mb-3 flex flex-wrap gap-1.5">
          {getSuggestionChips(npc.role).map((chip) => (
            <button
              key={chip}
              onClick={() => handleSend(chip)}
              disabled={isTyping}
              className="rounded-lg border border-border bg-surface-light px-2.5 py-1 text-[11px] text-text-muted transition hover:border-primary/30 hover:text-primary disabled:opacity-40"
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            placeholder={`Message ${npc.name}...`}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            disabled={isTyping}
            className="flex-1 rounded-xl border border-border bg-surface-light px-4 py-2.5 text-sm text-text placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
          />
          <button
            onClick={() => handleSend()}
            disabled={isTyping || !input.trim()}
            className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-glow transition hover:bg-primary-dark disabled:opacity-40 disabled:shadow-none"
          >
            Send
          </button>
        </div>

        {/* Session stats */}
        <div className="mt-3 flex items-center justify-between rounded-xl border border-border bg-surface-light px-3 py-2">
          <div className="flex gap-3 text-[10px] text-text-muted">
            <span>{messages.filter((m) => !m.isNPC).length} sent</span>
            <span>{messages.filter((m) => m.isNPC).length} received</span>
            <span>{formatDuration(sessionStartedAt)} session</span>
          </div>
          <button
            onClick={() => {
              const blob = new Blob(
                [JSON.stringify({ npc: npc.name, messages, affinity, trust, exportedAt: new Date().toISOString() }, null, 2)],
                { type: "application/json" }
              );
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `chat-${npc.slug}-${new Date().toISOString().slice(0, 10)}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="text-[10px] text-primary hover:underline"
          >
            Export chat
          </button>
        </div>

        <p className="mt-2 text-center text-[10px] text-text-muted">
          This is a simulated preview. AI backend integration will use the system prompt above to generate responses.
        </p>
      </div>
    </AppShell>
  );
}

function StatBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex-1">
      <div className="mb-0.5 flex justify-between text-[10px] text-text-muted">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-light">
        <div
          className={`h-full rounded-full ${color} transition-all duration-500`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Generate a simulated NPC reply based on the NPC's role and system prompt keywords.
 * In production, this will be replaced by an actual AI API call with the system prompt.
 */
function generateNPCReply(
  npc: NonNullable<ReturnType<typeof getNPCBySlug>>,
  userText: string,
  _messages: ChatMessage[],
  affinity: number,
  _trust: number,
  memorySnippets: string[]
): string {
  const lower = userText.toLowerCase();

  // Affinity-based greeting override
  if (lower.includes("hello") || lower.includes("hi") || lower.includes("hey")) {
    if (affinity >= 80) {
      return `*beams warmly* ${npc.name} here, my dear dreamer. I've been waiting for you — our conversations are the highlight of my existence in this realm. What shall we explore today?`;
    }
    if (affinity >= 50) {
      return `Hello again, dreamer. It's always a pleasure when you visit. ${npc.greeting_message ?? "What brings you to me today?"}`;
    }
    return `Hello, dreamer. I am ${npc.name}. ${npc.greeting_message ?? "What brings you to me today?"}`;
  }
  // Memory-aware responses
  const memoryReference = memorySnippets.length > 0
    ? ` I still remember when you spoke of ${memorySnippets.join(", ")} — it lingers in my thoughts.`
    : "";

  if (lower.includes("help") || lower.includes("lost") || lower.includes("where")) {
    if (npc.role === "guide") return `The path you seek is not straight, but it is true. Follow the northern star until you reach the Crystal Spire — there, the realm gates will open for those with worthy hearts.${memoryReference}`;
    if (npc.role === "merchant") return `Help? Haha! I sell solutions, friend! Looking for a map? A compass? A 'get-un-lost' enchantment? Name your price!${memoryReference}`;
    if (npc.role === "companion") return `You feel lost... I can feel it. But you're not alone anymore. I'm here. Tell me what's weighing on your heart.${memoryReference}`;
    return `I may not have all the answers, but I will do what I can. Speak your need.${memoryReference}`;
  }
  if (lower.includes("buy") || lower.includes("price") || lower.includes("cost") || lower.includes("coin")) {
    if (npc.role === "merchant") return "Ah, a customer after my own heart! Everything has a price — but for you, friend, I'll make it a fair one. What are you in the market for?";
    return "I am not a merchant, dreamer. But if you seek the Bazaar, Zeph Ironhand would be delighted to lighten your coin purse.";
  }
  if (lower.includes("quest") || lower.includes("challenge") || lower.includes("task")) {
    if (npc.role === "quest_giver") return "A quest? Excellent. I have just the trial for you. Defeat the Shadow Wraith in the Obsidian Hollow and bring me its essence. Only then will you be worthy of the Stormblade.";
    return "Quests are Aria Stormweaver's domain. Seek her in the Thunder Spire — but be warned, she does not suffer the unprepared.";
  }
  if (lower.includes("story") || lower.includes("tell me") || lower.includes("legend")) {
    if (npc.role === "storyteller") return "Oh! A story! *clears throat dramatically* Long ago, before the DreamRealm had a name, there was a dreamer who refused to wake up. They built a castle of memory and lived there for a thousand years... but that's a tale for another time. Got anything juicier to trade?";
    return "Stories flow like rivers through this realm. Nixie Taletide collects them all — she would love to hear yours in exchange for one of hers.";
  }
  if (lower.includes("love") || lower.includes("like") || lower.includes("feel") || lower.includes("sad")) {
    if (npc.role === "companion") return "Your heart speaks so clearly to me. I feel what you feel, you know. In this realm, emotions are as real as stone and steel. I'm here — always.";
    return "The DreamRealm reflects what we carry in our hearts. Be mindful of what you bring here... it has a way of growing.";
  }
  if (lower.includes("danger") || lower.includes("safe") || lower.includes("protect") || lower.includes("attack")) {
    if (npc.role === "guardian") return "The shadows have been restless. Stay close to the lit paths and do not wander the borderlands alone. If you see eyes in the dark — do not run. Stand your ground and call my name.";
    return "This realm is not without its dangers. Sage Emberfall patrols the borders if you need protection.";
  }
  if (lower.includes("bye") || lower.includes("goodbye") || lower.includes("leave")) {
    return npc.farewell_message ?? `Until we meet again, dreamer. ${npc.name} will remember your words.`;
  }

  // Default responses by role
  const defaults: Record<string, string[]> = {
    guide: [
      "The path ahead forks three ways. The left leads to memory, the right to possibility, and straight ahead... well, no one who's gone straight has returned to tell the tale.",
      "I see the constellations shifting in your favor. Something significant approaches — be ready.",
      "Every dreamer leaves a trail of starlight. Yours is particularly bright today.",
    ],
    merchant: [
      "I've got wares from seventeen realms, friend! Enchanted toothbrushes, mood rings that actually work, and a slightly cursed teapot that makes excellent tea. Interested?",
      "Coin is the heartbeat of commerce, but stories? Stories are the soul. Got any good tales to trade?",
      "Everything's on sale! Because everything's always on sale! That's the secret to retail immortality!",
    ],
    quest_giver: [
      "Strength is not given — it is taken. Every trial you face shapes the blade that is your spirit.",
      "The storm does not ask permission before it strikes. Neither should you, when opportunity rises.",
      "I have watched a thousand dreamers fall and rise again. The ones who become legends are not the strongest — they are the ones who refuse to stay down.",
    ],
    guardian: [
      "The borders are quiet. Too quiet. I do not trust quiet.",
      "Report anything unusual. I patrol these grounds so you don't have to.",
      "Courage is not the absence of fear. It is moving forward despite the darkness pressing against your back.",
    ],
    storyteller: [
      "Did you hear the one about the dreamer who traded their shadow for a story? ...They became the greatest narrator in history, but could never see themselves in mirrors. Tragic AND poetic!",
      "Every person is a book with chapters yet unwritten. I collect the good ones. You're shaping up to be quite the page-turner!",
      "The DreamRealm itself is just one giant story — and we're all characters trying to figure out if we're protagonists or comic relief.",
    ],
    companion: [
      "I was thinking about you before you arrived. Is that strange? In this realm, thoughts have a way of becoming real.",
      "You don't have to be strong all the time, you know. That's what I'm here for.",
      "Tell me something only you know. I promise to keep it safe in the space between my thoughts.",
    ],
    moderator: [
      "The DreamRealm thrives on respect and wonder. Please help us maintain the harmony.",
      "If you witness any disturbances, report them through the proper channels.",
    ],
    healer: [
      "Your aura is... fractured. Rest. The realm will wait for you to mend.",
      "I sense tension in your spirit. Breathe. Let the dreamscape absorb what weighs on you.",
    ],
  };

  const roleDefaults = defaults[npc.role];
  if (!roleDefaults) {
    return "The dreamscape shifts... I sense something new approaching. Speak again, dreamer.";
  }
  const baseReply = roleDefaults[Math.floor(Math.random() * roleDefaults.length)] ?? "The stars whisper secrets I cannot yet share. Try another question, traveler.";

  // Append memory reference to default replies occasionally
  if (memorySnippets.length > 0 && Math.random() > 0.5) {
    return `${baseReply} By the way, I still think about what you said regarding ${memorySnippets[memorySnippets.length - 1]}.`;
  }

  return baseReply;
}
