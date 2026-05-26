/**
 * User sample data and helpers.
 *
 * Static user definitions for Phase 3 frontend previews.
 * Will be replaced by API calls once the backend user endpoints are built.
 */

export interface SampleUser {
  id: string;
  username: string;
  displayName: string;
  avatar: string | null;
  bio: string;
  interests: string[];
  joinedRealms: string[];
  savedRealms: string[];
  role: "founder" | "admin" | "moderator" | "builder" | "host" | "vendor" | "member" | "guest";
  status: "active" | "away" | "busy" | "offline";
  trustScore: number;
  verified: boolean;

  // Gamification
  level: number;
  totalXp: number;
  xpToNextLevel: number;
  reputationScore: number;
  achievements: string[];
  skills: { name: string; level: number; maxLevel: number; xp: number }[];
  inventory: { name: string; type: string; rarity: string; equipped: boolean }[];
  mood: string;
  presenceStatus: string;
  statusMessage: string;
  guilds: { name: string; role: string; memberCount: number }[];
  friends: string[];
  coins: number;
  profileTheme: string;

  // Economy
  tier: "free" | "silver" | "gold" | "platinum";
  lifetimeEarned: number;
  lifetimeSpent: number;
  transactions: {
    id: string;
    type: string;
    amount: number;
    description: string;
    createdAt: string;
  }[];
}

export const SAMPLE_USERS: SampleUser[] = [
  {
    id: "user-001",
    username: "dreamcadian_founder",
    displayName: "Dreamcadian Founder",
    avatar: null,
    bio: "Building the digital world where dreamers connect, create, and thrive. Welcome to the ecosystem.",
    interests: ["Entrepreneurship", "Blockchain", "Community Building", "Design"],
    joinedRealms: ["Business Builder Realm", "The Creator's Market"],
    savedRealms: ["The Temple of Thoughts"],
    role: "founder",
    status: "active",
    trustScore: 100,
    verified: true,

    level: 47,
    totalXp: 12450,
    xpToNextLevel: 200,
    reputationScore: 9850,
    achievements: ["First Steps", "Social Butterfly", "Realm Explorer", "Content Creator", "Guild Founder", "Legendary Dreamer"],
    skills: [
      { name: "Social Charm", level: 18, maxLevel: 20, xp: 1800 },
      { name: "Leadership Presence", level: 16, maxLevel: 20, xp: 3200 },
      { name: "Creative Vision", level: 12, maxLevel: 15, xp: 1440 },
      { name: "Market Wisdom", level: 10, maxLevel: 15, xp: 1000 },
    ],
    inventory: [
      { name: "Founder Badge", type: "badge", rarity: "legendary", equipped: true },
      { name: "Neon Avatar Frame", type: "avatar_frame", rarity: "epic", equipped: true },
      { name: "Realm Builder Hammer", type: "tool", rarity: "rare", equipped: false },
      { name: "Socialite Title", type: "title", rarity: "rare", equipped: true },
    ],
    mood: "focused",
    presenceStatus: "online",
    statusMessage: "Architecting the next realm...",
    guilds: [
      { name: "Dream Council", role: "founder", memberCount: 47 },
      { name: "The Builders Guild", role: "officer", memberCount: 23 },
    ],
    friends: ["realm_builder", "cupid_host", "creative_vendor"],
    coins: 28450,
    profileTheme: "cyber-aurora",
    tier: "platinum",
    lifetimeEarned: 124500,
    lifetimeSpent: 96050,
    transactions: [
      { id: "tx-001", type: "deposit", amount: 50000, description: "Initial founder allocation", createdAt: "2025-01-15T10:00:00Z" },
      { id: "tx-002", type: "referral_bonus", amount: 2500, description: "Referral: realm_builder joined", createdAt: "2025-02-03T14:22:00Z" },
      { id: "tx-003", type: "tip", amount: 800, description: "Received tip from creative_vendor", createdAt: "2025-03-12T09:15:00Z" },
      { id: "tx-004", type: "subscription", amount: -5000, description: "Platinum tier renewal", createdAt: "2025-04-01T00:00:00Z" },
      { id: "tx-005", type: "gift", amount: 1200, description: "Birthday gift from cupid_host", createdAt: "2025-04-18T20:30:00Z" },
      { id: "tx-006", type: "unlock", amount: -2500, description: "Unlocked Crystal Caverns realm pass", createdAt: "2025-05-02T16:45:00Z" },
      { id: "tx-007", type: "creator_payout", amount: 45000, description: "Creator revenue share Q1", createdAt: "2025-05-10T11:00:00Z" },
      { id: "tx-008", type: "tip", amount: -500, description: "Tipped cupid_host", createdAt: "2025-05-15T19:20:00Z" },
      { id: "tx-009", type: "adjustment", amount: 1000, description: "Bug bounty reward", createdAt: "2025-05-18T08:00:00Z" },
      { id: "tx-010", type: "stream_payment", amount: -1500, description: "Superchat in Crystal Spire stream", createdAt: "2025-05-20T21:10:00Z" },
      { id: "tx-011", type: "gift", amount: 500, description: "Gift from dating_dreamer", createdAt: "2025-05-21T13:00:00Z" },
    ],
  },
  {
    id: "user-002",
    username: "realm_builder",
    displayName: "Realm Builder",
    avatar: null,
    bio: "Architecting new realms and communities within DreamRealm. If you can imagine it, we can build it.",
    interests: ["Architecture", "Community Design", "Events", "Moderation"],
    joinedRealms: ["Business Builder Realm", "The Creator's Market", "The Temple of Thoughts"],
    savedRealms: ["Cupid's Corner"],
    role: "builder",
    status: "active",
    trustScore: 92,
    verified: true,

    level: 34,
    totalXp: 8200,
    xpToNextLevel: 350,
    reputationScore: 7120,
    achievements: ["First Steps", "Realm Explorer", "Content Creator"],
    skills: [
      { name: "Creative Vision", level: 13, maxLevel: 15, xp: 1560 },
      { name: "Leadership Presence", level: 8, maxLevel: 20, xp: 1600 },
      { name: "Crafting Artisan", level: 10, maxLevel: 15, xp: 1100 },
    ],
    inventory: [
      { name: "Realm Builder Hammer", type: "tool", rarity: "rare", equipped: true },
      { name: "Neon Avatar Frame", type: "avatar_frame", rarity: "epic", equipped: false },
    ],
    mood: "creative",
    presenceStatus: "in_realm",
    statusMessage: "Designing the new Crystal Spire realm...",
    guilds: [
      { name: "The Builders Guild", role: "founder", memberCount: 23 },
    ],
    friends: ["dreamcadian_founder", "creative_vendor"],
    coins: 12800,
    profileTheme: "neon-forge",
    tier: "gold",
    lifetimeEarned: 48500,
    lifetimeSpent: 35700,
    transactions: [
      { id: "tx-101", type: "deposit", amount: 10000, description: "Welcome bonus", createdAt: "2025-02-10T10:00:00Z" },
      { id: "tx-102", type: "tip", amount: 3500, description: "Commission tip from dreamcadian_founder", createdAt: "2025-03-05T11:30:00Z" },
      { id: "tx-103", type: "subscription", amount: -2000, description: "Gold tier monthly", createdAt: "2025-04-01T00:00:00Z" },
      { id: "tx-104", type: "unlock", amount: -1500, description: "Builder toolkit unlock", createdAt: "2025-04-15T14:00:00Z" },
      { id: "tx-105", type: "referral_bonus", amount: 1500, description: "Referral: creative_vendor joined", createdAt: "2025-05-01T09:00:00Z" },
      { id: "tx-106", type: "creator_payout", amount: 8000, description: "Realm builder commission payout", createdAt: "2025-05-12T16:00:00Z" },
    ],
  },
  {
    id: "user-003",
    username: "cupid_host",
    displayName: "Cupid's Corner Host",
    avatar: null,
    bio: "Your guide to love and connection in the digital age. Hosting events, moderating discussions, and sparking romance.",
    interests: ["Dating", "Relationships", "Events", "Psychology"],
    joinedRealms: ["Cupid's Corner", "Dating Dreamer Lounge"],
    savedRealms: ["The AfterDark Realm"],
    role: "host",
    status: "active",
    trustScore: 88,
    verified: true,

    level: 29,
    totalXp: 6300,
    xpToNextLevel: 400,
    reputationScore: 5400,
    achievements: ["First Steps", "Social Butterfly", "Matchmaker"],
    skills: [
      { name: "Social Charm", level: 15, maxLevel: 20, xp: 1500 },
      { name: "Magic Streamer", level: 8, maxLevel: 15, xp: 800 },
      { name: "Combat Banter", level: 6, maxLevel: 12, xp: 540 },
    ],
    inventory: [
      { name: "Socialite Title", type: "title", rarity: "rare", equipped: true },
      { name: "Mystery Box", type: "collectible", rarity: "uncommon", equipped: false },
    ],
    mood: "flirty",
    presenceStatus: "streaming",
    statusMessage: "Live now: Speed Dating Night in Cupid's Corner!",
    guilds: [
      { name: "Hearts United", role: "officer", memberCount: 34 },
    ],
    friends: ["dreamcadian_founder", "dating_dreamer"],
    coins: 8750,
    profileTheme: "rose-gold",
    tier: "silver",
    lifetimeEarned: 21200,
    lifetimeSpent: 12450,
    transactions: [
      { id: "tx-201", type: "deposit", amount: 5000, description: "Initial deposit", createdAt: "2025-03-01T10:00:00Z" },
      { id: "tx-202", type: "stream_payment", amount: 3200, description: "Speed Dating Night tips", createdAt: "2025-04-10T20:00:00Z" },
      { id: "tx-203", type: "subscription", amount: -800, description: "Silver tier monthly", createdAt: "2025-04-01T00:00:00Z" },
      { id: "tx-204", type: "tip", amount: -500, description: "Tipped dating_dreamer", createdAt: "2025-05-05T15:00:00Z" },
      { id: "tx-205", type: "gift", amount: 1200, description: "Gift from dreamcadian_founder", createdAt: "2025-05-10T12:00:00Z" },
      { id: "tx-206", type: "referral_bonus", amount: 800, description: "Referral bonus", createdAt: "2025-05-18T10:00:00Z" },
      { id: "tx-207", type: "unlock", amount: -600, description: "Unlocked VIP lounge pass", createdAt: "2025-05-22T18:00:00Z" },
    ],
  },
  {
    id: "user-004",
    username: "creative_vendor",
    displayName: "Creative Vendor",
    avatar: null,
    bio: "Digital artist and creator selling original works in the Creator's Market. Commissions open.",
    interests: ["Digital Art", "NFTs", "Design", "Music Production"],
    joinedRealms: ["The Creator's Market", "The AfterDark Realm"],
    savedRealms: ["Business Builder Realm"],
    role: "vendor",
    status: "active",
    trustScore: 85,
    verified: true,

    level: 22,
    totalXp: 4100,
    xpToNextLevel: 300,
    reputationScore: 3800,
    achievements: ["First Steps", "Content Creator"],
    skills: [
      { name: "Creative Vision", level: 10, maxLevel: 15, xp: 1200 },
      { name: "Crafting Artisan", level: 8, maxLevel: 15, xp: 880 },
      { name: "Market Wisdom", level: 6, maxLevel: 15, xp: 900 },
    ],
    inventory: [
      { name: "Neon Avatar Frame", type: "avatar_frame", rarity: "epic", equipped: true },
      { name: "Dream Coin Pouch", type: "consumable", rarity: "common", equipped: false },
    ],
    mood: "creative",
    presenceStatus: "busy",
    statusMessage: "Commission queue: 3 slots open",
    guilds: [
      { name: "The Artisans Collective", role: "member", memberCount: 56 },
    ],
    friends: ["dreamcadian_founder", "realm_builder"],
    coins: 15600,
    profileTheme: "midnight-canvas",
    tier: "gold",
    lifetimeEarned: 67800,
    lifetimeSpent: 52200,
    transactions: [
      { id: "tx-301", type: "deposit", amount: 10000, description: "Creator starter pack", createdAt: "2025-01-20T10:00:00Z" },
      { id: "tx-302", type: "creator_payout", amount: 25000, description: "Art commission sales", createdAt: "2025-02-28T14:00:00Z" },
      { id: "tx-303", type: "tip", amount: 15000, description: "Tips from marketplace buyers", createdAt: "2025-03-15T12:00:00Z" },
      { id: "tx-304", type: "subscription", amount: -2000, description: "Gold tier monthly", createdAt: "2025-04-01T00:00:00Z" },
      { id: "tx-305", type: "withdrawal", amount: -10000, description: "Payout to crypto wallet", createdAt: "2025-04-10T11:00:00Z" },
      { id: "tx-306", type: "unlock", amount: -800, description: "Premium portfolio features", createdAt: "2025-05-01T09:00:00Z" },
      { id: "tx-307", type: "stream_payment", amount: 4800, description: "Live art stream donations", createdAt: "2025-05-15T19:00:00Z" },
    ],
  },
  {
    id: "user-005",
    username: "dating_dreamer",
    displayName: "Dating Dreamer Member",
    avatar: null,
    bio: "Hopeless romantic looking for genuine connections. Love live music, long walks, and deep conversations.",
    interests: ["Dating", "Music", "Travel", "Cooking"],
    joinedRealms: ["Dating Dreamer Lounge", "Cupid's Corner"],
    savedRealms: ["The Temple of Thoughts"],
    role: "member",
    status: "active",
    trustScore: 78,
    verified: false,

    level: 12,
    totalXp: 1100,
    xpToNextLevel: 200,
    reputationScore: 890,
    achievements: ["First Steps", "Night Owl"],
    skills: [
      { name: "Social Charm", level: 5, maxLevel: 20, xp: 500 },
      { name: "Stealth Profile", level: 3, maxLevel: 10, xp: 240 },
    ],
    inventory: [
      { name: "Dream Coin Pouch", type: "consumable", rarity: "common", equipped: false },
    ],
    mood: "romantic",
    presenceStatus: "online",
    statusMessage: "Looking for someone to explore the Crystal Caverns with...",
    guilds: [
      { name: "Hearts United", role: "member", memberCount: 34 },
    ],
    friends: ["cupid_host"],
    coins: 420,
    profileTheme: "warm-glow",
    tier: "free",
    lifetimeEarned: 2500,
    lifetimeSpent: 2080,
    transactions: [
      { id: "tx-401", type: "deposit", amount: 1000, description: "Welcome bonus", createdAt: "2025-04-01T10:00:00Z" },
      { id: "tx-402", type: "referral_bonus", amount: 500, description: "Joined via cupid_host referral", createdAt: "2025-04-05T14:00:00Z" },
      { id: "tx-403", type: "gift", amount: 1000, description: "New member starter gift", createdAt: "2025-04-10T09:00:00Z" },
      { id: "tx-404", type: "tip", amount: -300, description: "Tipped cupid_host", createdAt: "2025-05-01T20:00:00Z" },
      { id: "tx-405", type: "unlock", amount: -500, description: "Unlocked Cupid's Corner premium", createdAt: "2025-05-10T15:00:00Z" },
      { id: "tx-406", type: "tip", amount: -200, description: "Tipped realm_builder", createdAt: "2025-05-15T18:00:00Z" },
      { id: "tx-407", type: "gift", amount: -500, description: "Gift to cupid_host", createdAt: "2025-05-20T12:00:00Z" },
      { id: "tx-408", type: "stream_payment", amount: -180, description: "Donation during stream", createdAt: "2025-05-22T21:00:00Z" },
      { id: "tx-409", type: "adjustment", amount: 500, description: "Daily login streak bonus", createdAt: "2025-05-22T23:59:00Z" },
    ],
  },
];

export function getUserById(id: string): SampleUser | undefined {
  return SAMPLE_USERS.find((u) => u.id === id);
}

export function getUserByUsername(username: string): SampleUser | undefined {
  return SAMPLE_USERS.find((u) => u.username === username);
}

export function getAllUsers(): SampleUser[] {
  return SAMPLE_USERS;
}
