/**
 * DreamRealm shared types and Zod schemas.
 *
 * All database entities are defined here as both Zod schemas (runtime)
 * and TypeScript types (compile-time) to guarantee contract safety
 * across web, mobile, edge functions, and AI agents.
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export const uuidSchema = z.string().uuid();
export const timestampSchema = z.string().datetime();
export const emailSchema = z.string().email();

export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

export const paginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    data: z.array(itemSchema),
    count: z.number().int().min(0),
    page: z.number().int().min(1),
    limit: z.number().int().min(1).max(100),
  });

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export const userRoleSchema = z.enum(["user", "moderator", "admin", "system"]);
export type UserRole = z.infer<typeof userRoleSchema>;

export const userSchema = z.object({
  id: uuidSchema,
  email: emailSchema,
  role: userRoleSchema.default("user"),
  email_confirmed_at: timestampSchema.nullable(),
  created_at: timestampSchema,
  updated_at: timestampSchema,
  last_sign_in_at: timestampSchema.nullable(),
  raw_user_meta_data: z.record(z.unknown()).nullable(),
  device_fingerprint: z.string().nullable(),
  geo_region: z.string().nullable(),
  trust_bucket: z.enum(["new", "verified", "trusted", "vip", "flagged"]).default("new"),
});

export type User = z.infer<typeof userSchema>;

export const signUpInputSchema = z.object({
  email: emailSchema,
  password: z.string().min(8).max(128),
});

export type SignUpInput = z.infer<typeof signUpInputSchema>;

export const signInInputSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
});

export type SignInInput = z.infer<typeof signInInputSchema>;

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

export const profileModeSchema = z.enum([
  "single_male",
  "single_female",
  "nonbinary",
  "couple_mf",
  "couple_mm",
  "couple_ff",
  "poly_open",
  "friends_only",
  "casual_dating",
  "serious_dating",
  "local_meetups",
  "swing_lifestyle",
  "creator_influencer",
  "verified_professional",
]);

export type ProfileMode = z.infer<typeof profileModeSchema>;

export const visibilitySchema = z.enum(["public", "friends", "matches", "private"]);
export type Visibility = z.infer<typeof visibilitySchema>;

export const profileSchema = z.object({
  id: uuidSchema,
  user_id: uuidSchema,
  mode: profileModeSchema,
  display_name: z.string().min(1).max(100),
  bio: z.string().max(2000).nullable(),
  birth_date: z.string().date().nullable(),
  city: z.string().max(100).nullable(),
  country: z.string().max(100).nullable(),
  latitude: z.number().min(-90).max(90).nullable(),
  longitude: z.number().min(-180).max(180).nullable(),
  looking_for: z.array(profileModeSchema).max(5).nullable(),
  visibility: visibilitySchema.default("public"),
  is_verified: z.boolean().default(false),
  is_active: z.boolean().default(true),
  trust_score: z.number().int().min(0).max(100).default(0),
  created_at: timestampSchema,
  updated_at: timestampSchema,
});

export type Profile = z.infer<typeof profileSchema>;

export const createProfileInputSchema = profileSchema
  .pick({
    mode: true,
    display_name: true,
    bio: true,
    birth_date: true,
    city: true,
    country: true,
    latitude: true,
    longitude: true,
    looking_for: true,
    visibility: true,
  })
  .partial({
    bio: true,
    birth_date: true,
    city: true,
    country: true,
    latitude: true,
    longitude: true,
    looking_for: true,
    visibility: true,
  });

export type CreateProfileInput = z.infer<typeof createProfileInputSchema>;

export const updateProfileInputSchema = profileSchema
  .pick({
    mode: true,
    display_name: true,
    bio: true,
    birth_date: true,
    city: true,
    country: true,
    latitude: true,
    longitude: true,
    looking_for: true,
    visibility: true,
    is_active: true,
  })
  .partial();

export type UpdateProfileInput = z.infer<typeof updateProfileInputSchema>;

// ---------------------------------------------------------------------------
// Media
// ---------------------------------------------------------------------------

export const mediaTypeSchema = z.enum(["image", "video", "voice", "document"]);
export type MediaType = z.infer<typeof mediaTypeSchema>;

export const mediaSchema = z.object({
  id: uuidSchema,
  profile_id: uuidSchema,
  type: mediaTypeSchema,
  url: z.string().url(),
  thumbnail_url: z.string().url().nullable(),
  blurhash: z.string().nullable(),
  is_private: z.boolean().default(false),
  encryption_key_id: z.string().nullable(),
  sort_order: z.number().int().min(0).default(0),
  created_at: timestampSchema,
});

export type Media = z.infer<typeof mediaSchema>;

// ---------------------------------------------------------------------------
// Matches
// ---------------------------------------------------------------------------

export const matchDirectionSchema = z.enum(["left", "right", "super"]);
export type MatchDirection = z.infer<typeof matchDirectionSchema>;

export const matchStatusSchema = z.enum(["pending", "matched", "blocked", "expired"]);
export type MatchStatus = z.infer<typeof matchStatusSchema>;

export const matchSchema = z.object({
  id: uuidSchema,
  actor_id: uuidSchema,
  target_id: uuidSchema,
  direction: matchDirectionSchema,
  status: matchStatusSchema.default("pending"),
  created_at: timestampSchema,
});

export type Match = z.infer<typeof matchSchema>;

// ---------------------------------------------------------------------------
// Conversations & Messages
// ---------------------------------------------------------------------------

export const conversationTypeSchema = z.enum(["direct", "group", "stream"]);
export type ConversationType = z.infer<typeof conversationTypeSchema>;

export const conversationSchema = z.object({
  id: uuidSchema,
  type: conversationTypeSchema.default("direct"),
  title: z.string().max(200).nullable(),
  created_by: uuidSchema,
  is_encrypted: z.boolean().default(false),
  encryption_key_fingerprint: z.string().nullable(),
  last_message_at: timestampSchema.nullable(),
  created_at: timestampSchema,
});

export type Conversation = z.infer<typeof conversationSchema>;

export const conversationMemberSchema = z.object({
  id: uuidSchema,
  conversation_id: uuidSchema,
  profile_id: uuidSchema,
  role: z.enum(["member", "admin", "owner"]).default("member"),
  joined_at: timestampSchema,
  last_read_at: timestampSchema.nullable(),
});

export type ConversationMember = z.infer<typeof conversationMemberSchema>;

export const messageTypeSchema = z.enum(["text", "image", "video", "voice", "system"]);
export type MessageType = z.infer<typeof messageTypeSchema>;

export const messageSchema = z.object({
  id: uuidSchema,
  conversation_id: uuidSchema,
  sender_profile_id: uuidSchema,
  type: messageTypeSchema.default("text"),
  content: z.string().max(10000).nullable(),
  encrypted_payload: z.string().nullable(),
  media_id: uuidSchema.nullable(),
  reply_to_id: uuidSchema.nullable(),
  is_deleted: z.boolean().default(false),
  created_at: timestampSchema,
});

export type Message = z.infer<typeof messageSchema>;

export const createMessageInputSchema = messageSchema
  .pick({
    conversation_id: true,
    type: true,
    content: true,
    encrypted_payload: true,
    media_id: true,
    reply_to_id: true,
  })
  .partial({
    encrypted_payload: true,
    media_id: true,
    reply_to_id: true,
  });

export type CreateMessageInput = z.infer<typeof createMessageInputSchema>;

export const createConversationInputSchema = z.object({
  type: conversationTypeSchema.default("direct"),
  title: z.string().max(200).optional(),
  is_encrypted: z.boolean().default(false),
  member_profile_ids: z.array(uuidSchema).min(1).max(50),
});

export type CreateConversationInput = z.infer<typeof createConversationInputSchema>;

// ---------------------------------------------------------------------------
// Streams
// ---------------------------------------------------------------------------

export const streamStatusSchema = z.enum(["scheduled", "live", "ended", "cancelled"]);
export type StreamStatus = z.infer<typeof streamStatusSchema>;

export const streamSchema = z.object({
  id: uuidSchema,
  profile_id: uuidSchema,
  title: z.string().max(300),
  description: z.string().max(2000).nullable(),
  status: streamStatusSchema.default("scheduled"),
  room_token: z.string().nullable(),
  is_private: z.boolean().default(false),
  token_gate_min: z.number().int().min(0).default(0),
  scheduled_at: timestampSchema.nullable(),
  started_at: timestampSchema.nullable(),
  ended_at: timestampSchema.nullable(),
  created_at: timestampSchema,
});

export type Stream = z.infer<typeof streamSchema>;

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export const eventSchema = z.object({
  id: uuidSchema,
  profile_id: uuidSchema,
  title: z.string().max(300),
  description: z.string().max(5000).nullable(),
  city: z.string().max(100),
  country: z.string().max(100).nullable(),
  latitude: z.number().min(-90).max(90).nullable(),
  longitude: z.number().min(-180).max(180).nullable(),
  starts_at: timestampSchema,
  ends_at: timestampSchema.nullable(),
  max_attendees: z.number().int().min(1).nullable(),
  is_private: z.boolean().default(false),
  token_gate_min: z.number().int().min(0).default(0),
  created_at: timestampSchema,
});

export type Event = z.infer<typeof eventSchema>;

// ---------------------------------------------------------------------------
// Wallet & Transactions (DreamCoin)
// ---------------------------------------------------------------------------

export const transactionTypeSchema = z.enum([
  "deposit",
  "withdrawal",
  "tip",
  "gift",
  "unlock",
  "subscription",
  "stream_payment",
  "creator_payout",
  "referral_bonus",
  "adjustment",
]);
export type TransactionType = z.infer<typeof transactionTypeSchema>;

export const walletSchema = z.object({
  id: uuidSchema,
  user_id: uuidSchema,
  balance: z.number().int().min(0).default(0),
  lifetime_earned: z.number().int().min(0).default(0),
  lifetime_spent: z.number().int().min(0).default(0),
  created_at: timestampSchema,
  updated_at: timestampSchema,
});

export type Wallet = z.infer<typeof walletSchema>;

export const transactionSchema = z.object({
  id: uuidSchema,
  wallet_id: uuidSchema,
  type: transactionTypeSchema,
  amount: z.number().int(),
  description: z.string().max(500).nullable(),
  reference_id: uuidSchema.nullable(),
  reference_table: z.string().max(64).nullable(),
  metadata: z.record(z.unknown()).nullable(),
  created_at: timestampSchema,
});

export type Transaction = z.infer<typeof transactionSchema>;

// ---------------------------------------------------------------------------
// Subscriptions
// ---------------------------------------------------------------------------

export const subscriptionTierSchema = z.enum(["free", "silver", "gold", "platinum"]);
export type SubscriptionTier = z.infer<typeof subscriptionTierSchema>;

export const subscriptionSchema = z.object({
  id: uuidSchema,
  user_id: uuidSchema,
  tier: subscriptionTierSchema.default("free"),
  starts_at: timestampSchema,
  ends_at: timestampSchema.nullable(),
  is_active: z.boolean().default(true),
  auto_renew: z.boolean().default(false),
  payment_provider: z.string().max(50).nullable(),
  provider_subscription_id: z.string().max(255).nullable(),
  created_at: timestampSchema,
  updated_at: timestampSchema,
});

export type Subscription = z.infer<typeof subscriptionSchema>;

// ---------------------------------------------------------------------------
// Trust & Moderation
// ---------------------------------------------------------------------------

export const reportReasonSchema = z.enum([
  "spam",
  "harassment",
  "fake_profile",
  "underage",
  "violence",
  "hate_speech",
  "nudity",
  "scam",
  "other",
]);
export type ReportReason = z.infer<typeof reportReasonSchema>;

export const reportStatusSchema = z.enum(["open", "under_review", "resolved", "dismissed"]);
export type ReportStatus = z.infer<typeof reportStatusSchema>;

export const reportSchema = z.object({
  id: uuidSchema,
  reporter_id: uuidSchema,
  reported_profile_id: uuidSchema,
  reason: reportReasonSchema,
  details: z.string().max(5000).nullable(),
  status: reportStatusSchema.default("open"),
  assigned_moderator_id: uuidSchema.nullable(),
  resolved_at: timestampSchema.nullable(),
  created_at: timestampSchema,
});

export type Report = z.infer<typeof reportSchema>;

export const trustScoreSchema = z.object({
  id: uuidSchema,
  user_id: uuidSchema,
  overall: z.number().int().min(0).max(100).default(0),
  identity: z.number().int().min(0).max(100).default(0),
  behavior: z.number().int().min(0).max(100).default(0),
  community: z.number().int().min(0).max(100).default(0),
  transaction: z.number().int().min(0).max(100).default(0),
  ai_insights: z.record(z.unknown()).nullable(),
  updated_at: timestampSchema,
});

export type TrustScore = z.infer<typeof trustScoreSchema>;

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export const notificationTypeSchema = z.enum([
  "match",
  "message",
  "like",
  "tip",
  "stream_start",
  "event_reminder",
  "system",
]);
export type NotificationType = z.infer<typeof notificationTypeSchema>;

export const notificationSchema = z.object({
  id: uuidSchema,
  user_id: uuidSchema,
  type: notificationTypeSchema,
  title: z.string().max(200),
  body: z.string().max(1000),
  data: z.record(z.unknown()).nullable(),
  is_read: z.boolean().default(false),
  sent_at: timestampSchema.nullable(),
  created_at: timestampSchema,
});

export type Notification = z.infer<typeof notificationSchema>;

// ---------------------------------------------------------------------------
// Realms
// ---------------------------------------------------------------------------

export const realmStatusSchema = z.enum(["active", "beta", "archived", "private"]);
export type RealmStatus = z.infer<typeof realmStatusSchema>;

export const realmSchema = z.object({
  id: uuidSchema,
  slug: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  description: z.string().max(5000).nullable(),
  category: z.string().max(100),
  image_url: z.string().url().nullable(),
  status: realmStatusSchema.default("active"),
  member_count: z.number().int().min(0).default(0),
  is_featured: z.boolean().default(false),
  is_joined: z.boolean().default(false),
  created_at: timestampSchema,
  updated_at: timestampSchema,
});

export type Realm = z.infer<typeof realmSchema>;

// ---------------------------------------------------------------------------
// AI Agent Logs
// ---------------------------------------------------------------------------

export const aiAgentTypeSchema = z.enum([
  "matchmaking",
  "moderation",
  "spam_detection",
  "trust_scoring",
  "growth",
  "recommendation",
  "creator_assistant",
]);
export type AIAgentType = z.infer<typeof aiAgentTypeSchema>;

export const aiAgentLogSchema = z.object({
  id: uuidSchema,
  agent_type: aiAgentTypeSchema,
  input_hash: z.string().max(128),
  output_summary: z.string().max(2000),
  model_used: z.string().max(100).nullable(),
  latency_ms: z.number().int().min(0).nullable(),
  metadata: z.record(z.unknown()).nullable(),
  created_at: timestampSchema,
});

export type AIAgentLog = z.infer<typeof aiAgentLogSchema>;

// ---------------------------------------------------------------------------
// Gamification: Achievements
// ---------------------------------------------------------------------------

export const achievementCategorySchema = z.enum([
  "social", "explorer", "creator", "trader", "competitor",
  "moderator", "romance", "mystery",
]);
export type AchievementCategory = z.infer<typeof achievementCategorySchema>;

export const achievementRaritySchema = z.enum([
  "common", "uncommon", "rare", "epic", "legendary", "mythic",
]);
export type AchievementRarity = z.infer<typeof achievementRaritySchema>;

export const achievementSchema = z.object({
  id: uuidSchema,
  slug: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  description: z.string().max(1000),
  category: achievementCategorySchema.default("social"),
  rarity: achievementRaritySchema.default("common"),
  icon_url: z.string().url().nullable(),
  xp_reward: z.number().int().min(0).default(0),
  coin_reward: z.number().int().min(0).default(0),
  unlock_condition: z.string().max(500).nullable(),
  sort_order: z.number().int().min(0).default(0),
  is_hidden: z.boolean().default(false),
  created_at: timestampSchema,
});

export type Achievement = z.infer<typeof achievementSchema>;

export const userAchievementSchema = z.object({
  id: uuidSchema,
  user_id: uuidSchema,
  achievement_id: uuidSchema,
  unlocked_at: timestampSchema,
  viewed_at: timestampSchema.nullable(),
});

export type UserAchievement = z.infer<typeof userAchievementSchema>;

// ---------------------------------------------------------------------------
// Gamification: Skill Trees
// ---------------------------------------------------------------------------

export const skillCategorySchema = z.enum([
  "social", "combat", "crafting", "magic", "stealth",
  "charisma", "leadership", "creativity",
]);
export type SkillCategory = z.infer<typeof skillCategorySchema>;

export const skillTreeSchema = z.object({
  id: uuidSchema,
  slug: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  description: z.string().max(1000).nullable(),
  category: skillCategorySchema.default("social"),
  max_level: z.number().int().min(1).max(100).default(10),
  icon_url: z.string().url().nullable(),
  parent_skill_id: uuidSchema.nullable(),
  xp_per_level: z.number().int().min(1).default(100),
  created_at: timestampSchema,
});

export type SkillTree = z.infer<typeof skillTreeSchema>;

export const userSkillSchema = z.object({
  id: uuidSchema,
  user_id: uuidSchema,
  skill_id: uuidSchema,
  current_level: z.number().int().min(0).max(100).default(0),
  current_xp: z.number().int().min(0).default(0),
  unlocked_at: timestampSchema,
  last_leveled_at: timestampSchema.nullable(),
});

export type UserSkill = z.infer<typeof userSkillSchema>;

// ---------------------------------------------------------------------------
// Gamification: User Stats & Leveling
// ---------------------------------------------------------------------------

export const userStatsSchema = z.object({
  id: uuidSchema,
  user_id: uuidSchema,
  total_xp: z.number().int().min(0).default(0),
  level: z.number().int().min(1).default(1),
  xp_to_next_level: z.number().int().min(1).default(100),
  reputation_score: z.number().int().min(0).max(10000).default(0),
  total_achievements: z.number().int().min(0).default(0),
  total_skills_maxed: z.number().int().min(0).default(0),
  quests_completed: z.number().int().min(0).default(0),
  realms_created: z.number().int().min(0).default(0),
  streams_hosted: z.number().int().min(0).default(0),
  messages_sent: z.number().int().min(0).default(0),
  matches_made: z.number().int().min(0).default(0),
  total_coins_earned: z.number().int().min(0).default(0),
  total_coins_spent: z.number().int().min(0).default(0),
  created_at: timestampSchema,
  updated_at: timestampSchema,
});

export type UserStats = z.infer<typeof userStatsSchema>;

// ---------------------------------------------------------------------------
// Gamification: Inventory
// ---------------------------------------------------------------------------

export const inventoryItemTypeSchema = z.enum([
  "badge", "cosmetic", "consumable", "tool", "collectible",
  "title", "theme", "avatar_frame",
]);
export type InventoryItemType = z.infer<typeof inventoryItemTypeSchema>;

export const inventoryItemSchema = z.object({
  id: uuidSchema,
  slug: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  description: z.string().max(1000).nullable(),
  type: inventoryItemTypeSchema.default("collectible"),
  rarity: achievementRaritySchema.default("common"),
  icon_url: z.string().url().nullable(),
  is_tradable: z.boolean().default(false),
  is_consumable: z.boolean().default(false),
  max_stack: z.number().int().min(1).max(999).default(1),
  metadata: z.record(z.unknown()).nullable(),
  created_at: timestampSchema,
});

export type InventoryItem = z.infer<typeof inventoryItemSchema>;

export const userInventorySchema = z.object({
  id: uuidSchema,
  user_id: uuidSchema,
  item_id: uuidSchema,
  quantity: z.number().int().min(1).default(1),
  is_equipped: z.boolean().default(false),
  acquired_at: timestampSchema,
  metadata: z.record(z.unknown()).nullable(),
});

export type UserInventory = z.infer<typeof userInventorySchema>;

// ---------------------------------------------------------------------------
// Social: Friendships
// ---------------------------------------------------------------------------

export const friendshipStatusSchema = z.enum([
  "pending", "accepted", "blocked", "muted",
]);
export type FriendshipStatus = z.infer<typeof friendshipStatusSchema>;

export const friendshipSchema = z.object({
  id: uuidSchema,
  requester_id: uuidSchema,
  addressee_id: uuidSchema,
  status: friendshipStatusSchema.default("pending"),
  requested_at: timestampSchema,
  responded_at: timestampSchema.nullable(),
  created_at: timestampSchema,
});

export type Friendship = z.infer<typeof friendshipSchema>;

// ---------------------------------------------------------------------------
// Social: Guilds / Clans
// ---------------------------------------------------------------------------

export const guildRoleSchema = z.enum([
  "founder", "officer", "member", "recruit", "guest",
]);
export type GuildRole = z.infer<typeof guildRoleSchema>;

export const guildSchema = z.object({
  id: uuidSchema,
  slug: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  description: z.string().max(5000).nullable(),
  emblem_url: z.string().url().nullable(),
  banner_url: z.string().url().nullable(),
  is_recruiting: z.boolean().default(true),
  min_level_required: z.number().int().min(1).default(1),
  member_count: z.number().int().min(0).default(0),
  total_guild_xp: z.number().int().min(0).default(0),
  guild_level: z.number().int().min(1).default(1),
  created_by: uuidSchema,
  created_at: timestampSchema,
  updated_at: timestampSchema,
});

export type Guild = z.infer<typeof guildSchema>;

export const guildMembershipSchema = z.object({
  id: uuidSchema,
  guild_id: uuidSchema,
  user_id: uuidSchema,
  role: guildRoleSchema.default("recruit"),
  joined_at: timestampSchema,
  guild_xp_contributed: z.number().int().min(0).default(0),
  is_active: z.boolean().default(true),
});

export type GuildMembership = z.infer<typeof guildMembershipSchema>;

// ---------------------------------------------------------------------------
// Presence: Mood & Status
// ---------------------------------------------------------------------------

export const moodSchema = z.enum([
  "adventurous", "chill", "creative", "flirty", "focused",
  "mysterious", "playful", "romantic", "social", "tired",
]);
export type Mood = z.infer<typeof moodSchema>;

export const userPresenceSchema = z.object({
  id: uuidSchema,
  user_id: uuidSchema,
  status: z.enum(["online", "away", "busy", "invisible", "streaming", "in_realm"]).default("online"),
  mood: moodSchema.nullable(),
  status_message: z.string().max(280).nullable(),
  current_realm_id: uuidSchema.nullable(),
  current_activity: z.string().max(200).nullable(),
  last_seen_at: timestampSchema,
  updated_at: timestampSchema,
});
export type UserPresence = z.infer<typeof userPresenceSchema>;

// ---------------------------------------------------------------------------
// Economy: Creator Payouts
// ---------------------------------------------------------------------------

export const payoutStatusSchema = z.enum([
  "pending",
  "processing",
  "paid",
  "rejected",
  "cancelled",
]);
export type PayoutStatus = z.infer<typeof payoutStatusSchema>;

export const payoutMethodSchema = z.enum([
  "bank_transfer",
  "crypto_wallet",
  "paypal",
  "stripe",
]);
export type PayoutMethod = z.infer<typeof payoutMethodSchema>;

export const creatorPayoutSchema = z.object({
  id: uuidSchema,
  user_id: uuidSchema,
  amount: z.number().int().min(1),
  status: payoutStatusSchema.default("pending"),
  method: payoutMethodSchema.nullable(),
  method_details: z.record(z.unknown()).nullable(),
  processor_reference: z.string().nullable(),
  requested_at: timestampSchema,
  processed_at: timestampSchema.nullable(),
  rejected_reason: z.string().max(500).nullable(),
  created_at: timestampSchema,
  updated_at: timestampSchema,
});

export type CreatorPayout = z.infer<typeof creatorPayoutSchema>;

// ---------------------------------------------------------------------------
// Economy: Marketplace
// ---------------------------------------------------------------------------

export const listingStatusSchema = z.enum([
  "draft",
  "active",
  "paused",
  "sold",
  "removed",
]);
export type ListingStatus = z.infer<typeof listingStatusSchema>;

export const listingCategorySchema = z.enum([
  "avatar_item",
  "avatar_frame",
  "title",
  "badge",
  "realm_pass",
  "premium_content",
  "commission",
  "digital_good",
  "subscription",
]);
export type ListingCategory = z.infer<typeof listingCategorySchema>;

export const marketplaceListingSchema = z.object({
  id: uuidSchema,
  seller_id: uuidSchema,
  title: z.string().min(1).max(120),
  description: z.string().max(2000).nullable(),
  category: listingCategorySchema,
  price: z.number().int().min(0),
  currency: z.string().default("DREAM"),
  stock: z.number().int().min(0).default(1),
  status: listingStatusSchema.default("draft"),
  media_ids: z.array(uuidSchema).nullable(),
  metadata: z.record(z.unknown()).nullable(),
  sales_count: z.number().int().min(0).default(0),
  rating_avg: z.number().min(0).max(5).default(0),
  rating_count: z.number().int().min(0).default(0),
  created_at: timestampSchema,
  updated_at: timestampSchema,
});

export type MarketplaceListing = z.infer<typeof marketplaceListingSchema>;

export const marketplacePurchaseSchema = z.object({
  id: uuidSchema,
  buyer_id: uuidSchema,
  listing_id: uuidSchema,
  seller_id: uuidSchema,
  price_paid: z.number().int().min(0),
  quantity: z.number().int().min(1).default(1),
  status: z.enum(["completed", "refunded", "disputed"]).default("completed"),
  created_at: timestampSchema,
});

export type MarketplacePurchase = z.infer<typeof marketplacePurchaseSchema>;

// ---------------------------------------------------------------------------
// AI NPCs & Companions
// ---------------------------------------------------------------------------

export const npcRoleSchema = z.enum([
  "guide",
  "merchant",
  "quest_giver",
  "guardian",
  "storyteller",
  "companion",
  "moderator",
  "healer",
]);
export type NPCRole = z.infer<typeof npcRoleSchema>;

export const npcMoodSchema = z.enum([
  "cheerful",
  "serious",
  "mysterious",
  "playful",
  "concerned",
  "excited",
  "calm",
  "flirty",
]);
export type NPCMood = z.infer<typeof npcMoodSchema>;

export const npcSchema = z.object({
  id: uuidSchema,
  slug: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  role: npcRoleSchema.default("guide"),
  avatar_url: z.string().url().nullable(),
  description: z.string().max(2000).nullable(),
  personality_traits: z.array(z.string().max(50)).max(10).default([]),
  backstory: z.string().max(5000).nullable(),
  greeting_message: z.string().max(500).nullable(),
  farewell_message: z.string().max(500).nullable(),
  voice_style: z.string().max(100).nullable(),
  system_prompt: z.string().max(10000).nullable(),
  model_config: z.record(z.unknown()).nullable(),
  is_active: z.boolean().default(true),
  is_public: z.boolean().default(true),
  realm_id: uuidSchema.nullable(),
  created_at: timestampSchema,
  updated_at: timestampSchema,
});

export type NPC = z.infer<typeof npcSchema>;

export const npcMemorySchema = z.object({
  id: uuidSchema,
  npc_id: uuidSchema,
  user_id: uuidSchema,
  memory_type: z.enum(["fact", "preference", "event", "emotion", "goal"]).default("fact"),
  content: z.string().max(2000),
  importance: z.number().int().min(1).max(10).default(5),
  embedding: z.array(z.number()).nullable(),
  expires_at: timestampSchema.nullable(),
  created_at: timestampSchema,
});

export type NPCMemory = z.infer<typeof npcMemorySchema>;

export const npcConversationSchema = z.object({
  id: uuidSchema,
  npc_id: uuidSchema,
  user_id: uuidSchema,
  message: z.string().max(10000),
  is_from_npc: z.boolean().default(false),
  model_used: z.string().max(100).nullable(),
  latency_ms: z.number().int().min(0).nullable(),
  tokens_used: z.number().int().min(0).nullable(),
  metadata: z.record(z.unknown()).nullable(),
  created_at: timestampSchema,
});

export type NPCConversation = z.infer<typeof npcConversationSchema>;

export const userNPCRelationshipSchema = z.object({
  id: uuidSchema,
  user_id: uuidSchema,
  npc_id: uuidSchema,
  affinity_score: z.number().int().min(-100).max(100).default(0),
  trust_level: z.number().int().min(0).max(100).default(0),
  interaction_count: z.number().int().min(0).default(0),
  last_interaction_at: timestampSchema.nullable(),
  favorite: z.boolean().default(false),
  blocked: z.boolean().default(false),
  created_at: timestampSchema,
  updated_at: timestampSchema,
});

export type UserNPCRelationship = z.infer<typeof userNPCRelationshipSchema>;
