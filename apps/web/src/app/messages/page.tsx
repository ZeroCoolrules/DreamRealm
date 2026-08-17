/**
 * Web Conversation List Page
 *
 * Displays all conversations the current user is a member of,
 * ordered by last message. Shows unread indicators, presence dots,
 * reaction counts, and links to individual chat rooms.
 *
 * Phase 4.5 enhancements:
 * - "New Group Chat" button + GroupChatModal
 * - Presence dot next to direct message conversations
 * - Simulated reaction counts on conversation previews
 * - FriendActivitySidebar on desktop right panel
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../components/AuthProvider";
import AppShell from "../components/AppShell";
import GroupChatModal from "../components/GroupChatModal";
import type { CreateGroupChatData } from "../components/GroupChatModal";
import FriendActivitySidebar from "../components/FriendActivitySidebar";
import PresenceIndicator from "../components/PresenceIndicator";
import {
  getMyConversations,
  subscribeToConversations,
} from "@dreamrealm/api-client";
import type { ConversationWithLastMessage } from "@dreamrealm/api-client";
import Link from "next/link";
import { SAMPLE_FRIENDS_ACTIVITY } from "../lib/social";

// Simulated reaction counts for conversation list previews
const SIMULATED_REACTION_COUNTS: Record<string, number> = {};
function getSimulatedReactions(id: string): number {
  if (!(id in SIMULATED_REACTION_COUNTS)) {
    SIMULATED_REACTION_COUNTS[id] = Math.floor(Math.random() * 8);
  }
  return SIMULATED_REACTION_COUNTS[id] ?? 0;
}

function formatTimeAgo(dateStr: string | null): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export default function MessagesPage() {
  const { client } = useAuth();
  const [conversations, setConversations] = useState<ConversationWithLastMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getMyConversations(client);
      setConversations(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load conversations");
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  useEffect(() => {
    load();
    const unsubscribe = subscribeToConversations(client, () => {
      load();
    });
    return unsubscribe;
  }, [client, load]);

  const handleCreateGroup = useCallback(
    (_data: CreateGroupChatData) => {
      // TODO: wire to createConversation API in Phase 5
      // For now we just close the modal after a short delay
      return new Promise<void>((resolve) => setTimeout(resolve, 600));
    },
    []
  );

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-text-muted">Loading conversations...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-danger">{error}</p>
      </main>
    );
  }

  return (
    <AppShell>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b border-border bg-surface px-6 py-4">
          <div className="mx-auto flex max-w-6xl items-center justify-between">
            <h1 className="text-xl font-bold text-text">Messages</h1>
            <div className="flex items-center gap-2">
              {/* New Group Chat */}
              <button
                onClick={() => setIsGroupModalOpen(true)}
                className="flex items-center gap-2 rounded-xl bg-primary px-3 py-1.5 text-sm font-semibold text-white shadow-glow transition hover:opacity-90 active:scale-95"
              >
                <PlusIcon className="h-4 w-4" />
                New Group
              </button>
              <Link
                href="/"
                className="rounded-lg border border-border px-3 py-1.5 text-sm text-text hover:bg-surface-light"
              >
                Dashboard
              </Link>
            </div>
          </div>
        </header>

        {/* Main layout: conversation list + friend sidebar */}
        <div className="mx-auto flex max-w-6xl gap-6 px-6 py-6">
          {/* Conversation list */}
          <div className="min-w-0 flex-1 rounded-2xl border border-border bg-surface">
            {conversations.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <p className="text-text-muted">No conversations yet.</p>
                <p className="mt-1 text-sm text-text-muted">
                  Start matching to chat with people.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {conversations.map((c) => {
                  const reactionCount = getSimulatedReactions(c.id);
                  const isDirect = c.type === "direct";
                  // Simulate presence: alternate online/offline for demo
                  const isOnline = c.id.charCodeAt(0) % 2 === 0;

                  return (
                    <Link
                      key={c.id}
                      href={`/messages/${c.id}`}
                      className="flex items-center justify-between px-5 py-4 transition hover:bg-surface-light"
                    >
                      {/* Avatar + presence */}
                      <div className="relative mr-3 shrink-0">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-sm font-bold text-primary">
                          {isDirect ? "D" : "G"}
                        </div>
                        {isDirect && (
                          <span className="absolute -bottom-0.5 -right-0.5">
                            <PresenceIndicator
                              status={isOnline ? "online" : "offline"}
                              size="sm"
                            />
                          </span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h2 className="truncate text-sm font-semibold text-text">
                            {c.title ?? (isDirect ? "Direct Message" : "Group Chat")}
                          </h2>
                          {c.is_encrypted && (
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                              Encrypted
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 truncate text-xs text-text-muted">
                          {isDirect ? "Private conversation" : `${c.type} chat`}
                        </p>
                        {/* Reaction counts */}
                        {reactionCount > 0 && (
                          <p className="mt-0.5 text-[10px] text-text-muted">
                            {reactionCount} reaction{reactionCount !== 1 ? "s" : ""}
                          </p>
                        )}
                      </div>

                      <div className="ml-4 flex flex-col items-end">
                        {c.last_message_at && (
                          <span className="text-xs text-text-muted">
                            {formatTimeAgo(c.last_message_at)}
                          </span>
                        )}
                        <span
                          className={`mt-1 h-2 w-2 rounded-full ${
                            c.last_message_at ? "bg-primary" : "bg-transparent"
                          }`}
                        />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Friend activity sidebar — desktop only */}
          <div className="hidden shrink-0 lg:block">
            <FriendActivitySidebar friends={SAMPLE_FRIENDS_ACTIVITY} />
          </div>
        </div>
      </div>

      {/* Group chat modal */}
      <GroupChatModal
        isOpen={isGroupModalOpen}
        onClose={() => setIsGroupModalOpen(false)}
        onCreate={handleCreateGroup}
      />
    </AppShell>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}
