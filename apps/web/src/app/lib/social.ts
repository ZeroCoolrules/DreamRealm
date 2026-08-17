/**
 * social.ts — Phase 4.5 sample data helpers
 *
 * Provides static sample data for message reactions, announcements,
 * and friend activity used across the social & communication features.
 * Will be replaced by real API/Supabase calls in production.
 */

import type { MessageReaction, Announcement } from "@dreamrealm/types";
import type { FriendActivity } from "../components/FriendActivitySidebar";

// ---------------------------------------------------------------------------
// Sample message reactions
// ---------------------------------------------------------------------------

/**
 * Sample reactions for demo/preview purposes.
 * In production these come from the message_reactions table.
 */
export const SAMPLE_REACTIONS: MessageReaction[] = [
  {
    id: "react-001",
    message_id: "msg-001",
    user_id: "user-001",
    reaction_type: "emoji",
    emoji: "❤️",
    created_at: "2025-05-22T10:00:00.000Z",
  },
  {
    id: "react-002",
    message_id: "msg-001",
    user_id: "user-002",
    reaction_type: "emoji",
    emoji: "❤️",
    created_at: "2025-05-22T10:01:00.000Z",
  },
  {
    id: "react-003",
    message_id: "msg-001",
    user_id: "user-003",
    reaction_type: "emoji",
    emoji: "🔥",
    created_at: "2025-05-22T10:02:00.000Z",
  },
  {
    id: "react-004",
    message_id: "msg-002",
    user_id: "user-001",
    reaction_type: "emoji",
    emoji: "👍",
    created_at: "2025-05-22T10:05:00.000Z",
  },
  {
    id: "react-005",
    message_id: "msg-002",
    user_id: "user-004",
    reaction_type: "emoji",
    emoji: "😂",
    created_at: "2025-05-22T10:06:00.000Z",
  },
];

// ---------------------------------------------------------------------------
// Sample announcements
// ---------------------------------------------------------------------------

/**
 * Sample announcements for demo/preview purposes.
 * In production these come from the announcements table.
 */
export const SAMPLE_ANNOUNCEMENTS: Announcement[] = [
  {
    id: "ann-001",
    realm_id: null,
    title: "Welcome to DreamRealm 4.5!",
    body: "We just shipped group reactions, reply threads, and friend presence. Explore the new features and let us know what you think!",
    priority: "high",
    is_pinned: true,
    starts_at: "2025-05-01T00:00:00.000Z",
    expires_at: "2025-06-30T23:59:59.000Z",
    created_by: "user-001",
    created_at: "2025-05-01T00:00:00.000Z",
    updated_at: "2025-05-01T00:00:00.000Z",
  },
  {
    id: "ann-002",
    realm_id: null,
    title: "Maintenance window — June 1st 2AM UTC",
    body: "The platform will be offline for approximately 30 minutes for infrastructure upgrades. Plan accordingly.",
    priority: "urgent",
    is_pinned: false,
    starts_at: "2025-05-25T00:00:00.000Z",
    expires_at: "2025-06-02T02:30:00.000Z",
    created_by: "user-001",
    created_at: "2025-05-25T00:00:00.000Z",
    updated_at: "2025-05-25T00:00:00.000Z",
  },
  {
    id: "ann-003",
    realm_id: null,
    title: "DreamCoin bonus weekend",
    body: "Earn 2× DreamCoin on all tips and gifts this weekend only. Celebrate with your community!",
    priority: "normal",
    is_pinned: false,
    starts_at: "2025-05-24T00:00:00.000Z",
    expires_at: "2025-05-26T23:59:59.000Z",
    created_by: "user-001",
    created_at: "2025-05-24T00:00:00.000Z",
    updated_at: "2025-05-24T00:00:00.000Z",
  },
];

// ---------------------------------------------------------------------------
// Sample friends activity
// ---------------------------------------------------------------------------

/**
 * Sample friend activity entries for the FriendActivitySidebar.
 * In production this comes from the user_presence table joined with friendships.
 */
export const SAMPLE_FRIENDS_ACTIVITY: FriendActivity[] = [
  {
    id: "user-001",
    name: "Dreamcadian Founder",
    status: "online",
    activity: "Architecting the next realm…",
  },
  {
    id: "user-002",
    name: "Realm Builder",
    status: "online",
    activity: "In Crystal Spire Realm",
  },
  {
    id: "user-003",
    name: "Cupid's Corner Host",
    status: "busy",
    activity: "🔴 Live: Speed Dating Night",
  },
  {
    id: "user-004",
    name: "Creative Vendor",
    status: "away",
    activity: "Commission queue open",
  },
  {
    id: "user-005",
    name: "Dating Dreamer",
    status: "offline",
    activity: "Last seen 2h ago",
  },
];
