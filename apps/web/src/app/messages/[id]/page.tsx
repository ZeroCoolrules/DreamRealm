/**
 * Web Chat Room Page (Dynamic Route)
 *
 * Displays messages for a specific conversation with real-time updates
 * via Supabase Realtime. Includes message sending, auto-scroll, and
 * basic sender differentiation (me vs others).
 *
 * Phase 4.5 enhancements:
 * - ReactionBar below received messages
 * - Reply-to thread simulation (local state)
 * - Typing indicator animation (simulated random timeout)
 * - Relative timestamps ("2m ago", "1h ago")
 * - Announcement banner at top (local state, sample data)
 */

"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "../../components/AuthProvider";
import AppShell from "../../components/AppShell";
import ReactionBar from "../../components/ReactionBar";
import type { ReactionItem } from "../../components/ReactionBar";
import {
  getConversationMessages,
  sendMessage,
  subscribeToMessages,
  updateLastRead,
} from "@dreamrealm/api-client";
import type { Message } from "@dreamrealm/types";
import Link from "next/link";
import { SAMPLE_ANNOUNCEMENTS } from "../../lib/social";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 30) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/** Priority colour for announcement banner */
function announcementColor(priority: string): string {
  switch (priority) {
    case "urgent": return "border-danger/30 bg-danger/10 text-danger";
    case "high": return "border-warning/30 bg-warning/10 text-warning";
    case "normal": return "border-primary/20 bg-primary/10 text-primary";
    default: return "border-border bg-surface-light text-text-muted";
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LocalReply {
  id: string;
  messageId: string;
  content: string;
  createdAt: string;
}

// Map of message_id → reactions (local state for demo)
type ReactionsMap = Record<string, ReactionItem[]>;

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ChatPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { client, user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [reactionsMap, setReactionsMap] = useState<ReactionsMap>({});
  const [replies, setReplies] = useState<LocalReply[]>([]);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [announcementDismissed, setAnnouncementDismissed] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Show first sample announcement
  const activeAnnouncement = announcementDismissed ? null : SAMPLE_ANNOUNCEMENTS[0] ?? null;

  const loadMessages = useCallback(async () => {
    try {
      const data = await getConversationMessages(client, id, 50);
      setMessages(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load messages");
    } finally {
      setIsLoading(false);
    }
  }, [client, id]);

  // Initial load and realtime subscription
  useEffect(() => {
    loadMessages();
    updateLastRead(client, id).catch(() => {});

    const unsubscribe = subscribeToMessages(client, id, (newMessage) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMessage.id)) return prev;
        return [...prev, newMessage];
      });
      // Simulate someone typing then stopping
      setIsTyping(true);
      setTimeout(() => setIsTyping(false), 2000 + Math.random() * 3000);
    });

    return () => {
      unsubscribe();
    };
  }, [client, id, loadMessages]);

  // Simulate occasional typing indicator for demo
  useEffect(() => {
    const timer = setInterval(() => {
      const show = Math.random() > 0.7;
      setIsTyping(show);
      if (show) {
        setTimeout(() => setIsTyping(false), 2500);
      }
    }, 8000);
    return () => clearInterval(timer);
  }, []);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isSending) return;

    setIsSending(true);
    setError(null);

    // If replying, add as local reply first
    if (replyingTo) {
      const localReply: LocalReply = {
        id: `reply-${Date.now()}`,
        messageId: replyingTo.id,
        content: input.trim(),
        createdAt: new Date().toISOString(),
      };
      setReplies((prev) => [...prev, localReply]);
      setReplyingTo(null);
      setInput("");
      setIsSending(false);
      return;
    }

    try {
      await sendMessage(client, {
        conversation_id: id,
        type: "text",
        content: input.trim(),
      });
      setInput("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  /** Toggle a reaction on a message (local state only for demo) */
  const handleReact = useCallback((messageId: string, emoji: string) => {
    setReactionsMap((prev) => {
      const current = prev[messageId] ?? [];
      const existing = current.find((r) => r.emoji === emoji);
      if (existing) {
        // Toggle off
        return {
          ...prev,
          [messageId]: current.map((r) =>
            r.emoji === emoji
              ? { ...r, isMine: !r.isMine, count: Math.max(0, r.count + (r.isMine ? -1 : 1)) }
              : r
          ),
        };
      }
      // Add new
      return {
        ...prev,
        [messageId]: [...current, { emoji, count: 1, isMine: true }],
      };
    });
  }, []);

  const myProfileId = user?.id;

  return (
    <AppShell>
      <div className="flex h-[calc(100vh-64px)] flex-col bg-background">
        {/* Header */}
        <header className="border-b border-border bg-surface px-6 py-3">
          <div className="mx-auto flex max-w-3xl items-center justify-between">
            <Link
              href="/messages"
              className="text-sm text-text-muted hover:text-text"
            >
              ← Back
            </Link>
            <h1 className="text-sm font-semibold text-text">Chat</h1>
            <span className="text-sm text-text-muted">{messages.length} messages</span>
          </div>
        </header>

        {/* Announcement banner */}
        {activeAnnouncement && (
          <div
            className={`mx-auto mt-2 w-full max-w-3xl animate-in slide-in-from-top-1 duration-200`}
          >
            <div
              className={`mx-4 flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${
                announcementColor(activeAnnouncement.priority)
              }`}
            >
              <div className="min-w-0">
                <p className="font-semibold">{activeAnnouncement.title}</p>
                <p className="mt-0.5 text-xs opacity-80">{activeAnnouncement.body}</p>
              </div>
              <button
                onClick={() => setAnnouncementDismissed(true)}
                aria-label="Dismiss announcement"
                className="mt-0.5 shrink-0 rounded p-0.5 opacity-70 hover:opacity-100"
              >
                <CloseIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-text-muted">Loading messages...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-text-muted">No messages yet. Say hello!</p>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-4">
              {messages.map((msg) => {
                const isMe = msg.sender_profile_id === myProfileId;
                const messageReactions = reactionsMap[msg.id] ?? [];
                const messageReplies = replies.filter((r) => r.messageId === msg.id);

                return (
                  <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                    {/* Bubble */}
                    <div
                      className={`group relative max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                        isMe
                          ? "bg-primary text-white"
                          : "bg-surface-light text-text"
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                      {/* Relative timestamp */}
                      <p
                        className={`mt-1 text-right text-[10px] ${
                          isMe ? "text-white/60" : "text-text-muted"
                        }`}
                      >
                        {formatRelativeTime(msg.created_at)}
                      </p>

                      {/* Reply button — appears on hover for received messages */}
                      {!isMe && (
                        <button
                          onClick={() => setReplyingTo(msg)}
                          className="absolute -right-8 top-1 hidden rounded-lg p-1 text-text-muted transition hover:bg-surface-light hover:text-text group-hover:block"
                          aria-label="Reply to message"
                        >
                          <ReplyIcon className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    {/* ReactionBar — only for received messages */}
                    {!isMe && (
                      <div className="ml-1">
                        <ReactionBar
                          reactions={messageReactions}
                          onReact={(emoji) => handleReact(msg.id, emoji)}
                        />
                      </div>
                    )}

                    {/* Threaded replies */}
                    {messageReplies.length > 0 && (
                      <div className="ml-4 mt-1 space-y-1 border-l-2 border-primary/20 pl-3">
                        {messageReplies.map((reply) => (
                          <div
                            key={reply.id}
                            className="rounded-xl bg-primary/10 px-3 py-1.5 text-xs text-text"
                          >
                            <p className="font-semibold text-primary text-[10px] mb-0.5">You replied</p>
                            <p>{reply.content}</p>
                            <p className="mt-0.5 text-[10px] text-text-muted">
                              {formatRelativeTime(reply.createdAt)}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Typing indicator */}
              {isTyping && (
                <div className="flex items-start">
                  <div className="rounded-2xl bg-surface-light px-4 py-2">
                    <TypingDots />
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Reply preview bar */}
        {replyingTo && (
          <div className="border-t border-border bg-surface/80 px-6 py-2">
            <div className="mx-auto flex max-w-3xl items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-primary">Replying to</p>
                <p className="truncate text-xs text-text-muted">{replyingTo.content}</p>
              </div>
              <button
                onClick={() => setReplyingTo(null)}
                className="shrink-0 rounded-lg p-1 text-text-muted hover:text-text"
                aria-label="Cancel reply"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Input area */}
        <div className="border-t border-border bg-surface px-6 py-3">
          <form
            onSubmit={handleSend}
            className="mx-auto flex max-w-3xl items-center gap-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={replyingTo ? "Write a reply…" : "Type a message..."}
              className="flex-1 rounded-full border border-border bg-surface-light px-4 py-2 text-sm text-text placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              type="submit"
              disabled={isSending || !input.trim()}
              className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition"
            >
              {isSending ? "…" : "Send"}
            </button>
          </form>
          {error && (
            <p className="mx-auto mt-2 max-w-3xl text-center text-xs text-danger">
              {error}
            </p>
          )}
        </div>
      </div>
    </AppShell>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Animated three-dot typing indicator */
function TypingDots() {
  return (
    <span className="flex items-center gap-1" aria-label="Someone is typing">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-muted"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </span>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function ReplyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
    </svg>
  );
}
