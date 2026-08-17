/**
 * GroupChatModal
 *
 * A portal-style modal overlay for creating a new group conversation.
 * Supports title input, multi-select participant checklist, and
 * a public/private type selector.
 *
 * Uses a fixed inset-0 overlay for accessibility and keyboard trap.
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { getAllUsers } from "../lib/users";

export interface CreateGroupChatData {
  title: string;
  participantIds: string[];
  type: string;
}

interface GroupChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: CreateGroupChatData) => void;
}

export default function GroupChatModal({
  isOpen,
  onClose,
  onCreate,
}: GroupChatModalProps) {
  const [title, setTitle] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [chatType, setChatType] = useState<"public" | "private">("private");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const titleInputRef = useRef<HTMLInputElement>(null);
  const allUsers = getAllUsers();

  // Focus title input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTitle("");
      setSelectedIds([]);
      setChatType("private");
      setError(null);
      setTimeout(() => titleInputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const toggleParticipant = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Please enter a group name.");
      return;
    }
    if (selectedIds.length === 0) {
      setError("Select at least one participant.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onCreate({ title: title.trim(), participantIds: selectedIds, type: chatType });
      onClose();
    } catch {
      setError("Failed to create group chat. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="gcm-title"
    >
      {/* Panel */}
      <div className="relative mx-4 w-full max-w-md rounded-2xl border border-border bg-surface shadow-glow animate-in fade-in slide-in-from-bottom-4 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 id="gcm-title" className="text-base font-bold text-text">
            New Group Chat
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-text-muted transition hover:bg-surface-light hover:text-text"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5 px-5 py-5">
          {/* Group name */}
          <div>
            <label
              htmlFor="gcm-title-input"
              className="mb-1.5 block text-xs font-semibold text-text-muted uppercase tracking-wide"
            >
              Group Name <span className="text-danger">*</span>
            </label>
            <input
              ref={titleInputRef}
              id="gcm-title-input"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. The Dream Squad"
              maxLength={200}
              className="w-full rounded-xl border border-border bg-surface-light px-3 py-2.5 text-sm text-text placeholder-text-muted transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Type toggle */}
          <div>
            <span className="mb-1.5 block text-xs font-semibold text-text-muted uppercase tracking-wide">
              Chat Type
            </span>
            <div className="flex gap-2">
              {(["private", "public"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setChatType(t)}
                  className={`flex-1 rounded-xl border px-3 py-2 text-sm font-medium transition ${
                    chatType === t
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-text-muted hover:bg-surface-light hover:text-text"
                  }`}
                >
                  {t === "private" ? "🔒 Private" : "🌐 Public"}
                </button>
              ))}
            </div>
          </div>

          {/* Participants */}
          <div>
            <span className="mb-1.5 block text-xs font-semibold text-text-muted uppercase tracking-wide">
              Add Participants <span className="text-danger">*</span>
            </span>
            <div className="max-h-40 overflow-y-auto rounded-xl border border-border bg-surface-light">
              {allUsers.map((user) => {
                const isSelected = selectedIds.includes(user.id);
                return (
                  <label
                    key={user.id}
                    className="flex cursor-pointer items-center gap-3 px-3 py-2 transition hover:bg-surface"
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleParticipant(user.id)}
                      className="h-4 w-4 accent-primary rounded"
                    />
                    {/* Avatar */}
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
                      {user.displayName.charAt(0)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-text">
                        {user.displayName}
                      </p>
                      <p className="truncate text-[10px] text-text-muted">
                        @{user.username}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
            {selectedIds.length > 0 && (
              <p className="mt-1 text-xs text-primary">
                {selectedIds.length} participant{selectedIds.length !== 1 ? "s" : ""} selected
              </p>
            )}
          </div>

          {/* Error */}
          {error && (
            <p className="rounded-lg border border-danger/20 bg-danger/10 px-3 py-2 text-xs text-danger">
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-text-muted transition hover:bg-surface-light hover:text-text"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-glow transition hover:opacity-90 disabled:opacity-50"
            >
              {isSubmitting ? "Creating…" : "Create Group"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
