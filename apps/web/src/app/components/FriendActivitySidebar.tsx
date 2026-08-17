/**
 * FriendActivitySidebar
 *
 * Displays a collapsible list of online/nearby friends with their
 * current activity status. Intended for the desktop right sidebar
 * on the messages page.
 */

"use client";

import PresenceIndicator from "./PresenceIndicator";
import type { PresenceStatus } from "./PresenceIndicator";

export interface FriendActivity {
  id: string;
  name: string;
  /** online | away | busy | offline */
  status: string;
  activity: string;
}

interface FriendActivitySidebarProps {
  friends: FriendActivity[];
}

function resolveStatus(status: string): PresenceStatus {
  if (status === "online" || status === "away" || status === "busy") {
    return status;
  }
  return "offline";
}

export default function FriendActivitySidebar({
  friends,
}: FriendActivitySidebarProps) {
  const onlineFriends = friends.filter(
    (f) => f.status === "online" || f.status === "away" || f.status === "busy"
  );
  const offlineFriends = friends.filter((f) => f.status === "offline");

  return (
    <aside className="flex w-64 flex-col rounded-2xl border border-border bg-surface p-4 shadow-glow/5">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text">Friends</h2>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
          {onlineFriends.length} online
        </span>
      </div>

      {/* Online friends */}
      {onlineFriends.length > 0 && (
        <div className="space-y-1">
          {onlineFriends.map((friend) => (
            <FriendRow key={friend.id} friend={friend} />
          ))}
        </div>
      )}

      {/* Offline section */}
      {offlineFriends.length > 0 && (
        <>
          <p className="mb-1 mt-4 px-1 text-[10px] uppercase tracking-wider text-text-muted">
            Offline
          </p>
          <div className="space-y-1 opacity-60">
            {offlineFriends.map((friend) => (
              <FriendRow key={friend.id} friend={friend} />
            ))}
          </div>
        </>
      )}

      {friends.length === 0 && (
        <p className="mt-4 text-center text-xs text-text-muted">
          No friends yet. Start connecting!
        </p>
      )}
    </aside>
  );
}

function FriendRow({ friend }: { friend: FriendActivity }) {
  const presenceStatus = resolveStatus(friend.status);

  return (
    <div className="group flex items-center gap-2.5 rounded-xl px-2 py-2 transition hover:bg-surface-light">
      {/* Avatar placeholder */}
      <div className="relative shrink-0">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
          {friend.name.charAt(0).toUpperCase()}
        </div>
        {/* Presence dot overlaid on avatar */}
        <span className="absolute -bottom-0.5 -right-0.5">
          <PresenceIndicator status={presenceStatus} size="sm" />
        </span>
      </div>

      {/* Name + activity */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-text">{friend.name}</p>
        <p className="truncate text-[10px] text-text-muted">{friend.activity}</p>
      </div>
    </div>
  );
}
