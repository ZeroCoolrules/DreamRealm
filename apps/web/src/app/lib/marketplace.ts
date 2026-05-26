/**
 * Marketplace sample data and helpers.
 *
 * Static listing definitions for Phase 4.2 storefront preview.
 * Will be replaced by API calls once the backend marketplace endpoints are built.
 */

import type { MarketplaceListing, ListingCategory } from "@dreamrealm/types";

export interface SampleListing extends MarketplaceListing {
  seller_name: string;
  seller_avatar: string | null;
  seller_tier: "free" | "silver" | "gold" | "platinum";
}

const CATEGORY_ICONS: Record<ListingCategory, string> = {
  avatar_item: "👤",
  avatar_frame: "🖼️",
  title: "🏷️",
  badge: "🎖️",
  realm_pass: "🚪",
  premium_content: "🔓",
  commission: "🎨",
  digital_good: "💾",
  subscription: "⭐",
};

const CATEGORY_LABELS: Record<ListingCategory, string> = {
  avatar_item: "Avatar Item",
  avatar_frame: "Avatar Frame",
  title: "Title",
  badge: "Badge",
  realm_pass: "Realm Pass",
  premium_content: "Premium Content",
  commission: "Commission",
  digital_good: "Digital Good",
  subscription: "Subscription",
};

const RARITY_STYLES = {
  common: "bg-surface-light text-text-muted",
  uncommon: "bg-green-500/10 text-green-400 border-green-500/30",
  rare: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  epic: "bg-purple-500/10 text-purple-400 border-purple-500/30",
  legendary: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  mythic: "bg-gradient-to-r from-primary/20 to-accent/20 text-primary border-primary/30 shadow-glow",
} as const;

export function getCategoryIcon(category: ListingCategory): string {
  return CATEGORY_ICONS[category];
}

export function getCategoryLabel(category: ListingCategory): string {
  return CATEGORY_LABELS[category];
}

export function getRarityStyle(rarity: string): string {
  return (RARITY_STYLES as Record<string, string>)[rarity] ?? RARITY_STYLES.common;
}

export const SAMPLE_LISTINGS: SampleListing[] = [
  {
    id: "lst-001",
    seller_id: "user-004",
    seller_name: "Creative Vendor",
    seller_avatar: null,
    seller_tier: "gold",
    title: "Neon Avatar Frame Pack",
    description: "A set of 5 cyberpunk-inspired avatar frames with animated glow effects. Perfect for standing out in any realm chat or stream.",
    category: "avatar_frame",
    price: 2500,
    currency: "DREAM",
    stock: 47,
    status: "active",
    media_ids: null,
    metadata: { rarity: "epic", set_size: 5, animated: true },
    sales_count: 128,
    rating_avg: 4.7,
    rating_count: 34,
    created_at: "2025-03-15T10:00:00Z",
    updated_at: "2025-05-20T14:00:00Z",
  },
  {
    id: "lst-002",
    seller_id: "user-004",
    seller_name: "Creative Vendor",
    seller_avatar: null,
    seller_tier: "gold",
    title: "Crystal Spire Realm Pass",
    description: "Exclusive access pass to the Crystal Spire realm — a premium dating and social experience with private lounges, AI matchmaking, and weekly events.",
    category: "realm_pass",
    price: 5000,
    currency: "DREAM",
    stock: 12,
    status: "active",
    media_ids: null,
    metadata: { rarity: "legendary", duration_days: 30, exclusive: true },
    sales_count: 89,
    rating_avg: 4.9,
    rating_count: 21,
    created_at: "2025-04-01T10:00:00Z",
    updated_at: "2025-05-18T16:00:00Z",
  },
  {
    id: "lst-003",
    seller_id: "user-002",
    seller_name: "Realm Builder",
    seller_avatar: null,
    seller_tier: "gold",
    title: "Builder's Toolkit Pro",
    description: "Advanced realm building tools including custom scripts, interactive objects, and monetization plugins. Turn your dream world into a revenue stream.",
    category: "digital_good",
    price: 8000,
    currency: "DREAM",
    stock: 8,
    status: "active",
    media_ids: null,
    metadata: { rarity: "legendary", includes_support: true, updates_included: true },
    sales_count: 45,
    rating_avg: 4.5,
    rating_count: 18,
    created_at: "2025-02-20T10:00:00Z",
    updated_at: "2025-05-15T12:00:00Z",
  },
  {
    id: "lst-004",
    seller_id: "user-003",
    seller_name: "Cupid's Corner Host",
    seller_avatar: null,
    seller_tier: "silver",
    title: "Matchmaker Badge",
    description: "Exclusive matchmaker badge that grants you access to Cupid's Corner premium matchmaking events and priority matching queue.",
    category: "badge",
    price: 1200,
    currency: "DREAM",
    stock: 99,
    status: "active",
    media_ids: null,
    metadata: { rarity: "rare", event_access: true, priority_matching: true },
    sales_count: 234,
    rating_avg: 4.3,
    rating_count: 56,
    created_at: "2025-04-10T10:00:00Z",
    updated_at: "2025-05-22T10:00:00Z",
  },
  {
    id: "lst-005",
    seller_id: "user-001",
    seller_name: "Dreamcadian Founder",
    seller_avatar: null,
    seller_tier: "platinum",
    title: "Founder's Crown Title",
    description: "A legendary title reserved for early supporters and major contributors. Displays a golden crown next to your name across all realms.",
    category: "title",
    price: 15000,
    currency: "DREAM",
    stock: 3,
    status: "active",
    media_ids: null,
    metadata: { rarity: "mythic", limited_edition: true, total_minted: 50 },
    sales_count: 47,
    rating_avg: 5.0,
    rating_count: 12,
    created_at: "2025-01-10T10:00:00Z",
    updated_at: "2025-05-10T10:00:00Z",
  },
  {
    id: "lst-006",
    seller_id: "user-004",
    seller_name: "Creative Vendor",
    seller_avatar: null,
    seller_tier: "gold",
    title: "Custom Portrait Commission",
    description: "Personalized digital portrait in your choice of cyberpunk, fantasy, or realistic style. Delivered within 72 hours. One revision included.",
    category: "commission",
    price: 3500,
    currency: "DREAM",
    stock: 5,
    status: "active",
    media_ids: null,
    metadata: { rarity: "epic", delivery_days: 3, revisions: 1, style_options: ["cyberpunk", "fantasy", "realistic"] },
    sales_count: 67,
    rating_avg: 4.8,
    rating_count: 29,
    created_at: "2025-03-22T10:00:00Z",
    updated_at: "2025-05-21T14:00:00Z",
  },
  {
    id: "lst-007",
    seller_id: "user-002",
    seller_name: "Realm Builder",
    seller_avatar: null,
    seller_tier: "gold",
    title: "Temple of Thoughts Premium",
    description: "Unlock all premium content in the Temple of Thoughts — guided meditations, philosopher AI companions, and exclusive discussion rooms.",
    category: "premium_content",
    price: 1800,
    currency: "DREAM",
    stock: 500,
    status: "active",
    media_ids: null,
    metadata: { rarity: "uncommon", duration_days: 30, auto_renew: false },
    sales_count: 312,
    rating_avg: 4.4,
    rating_count: 78,
    created_at: "2025-05-01T10:00:00Z",
    updated_at: "2025-05-23T10:00:00Z",
  },
  {
    id: "lst-008",
    seller_id: "user-001",
    seller_name: "Dreamcadian Founder",
    seller_avatar: null,
    seller_tier: "platinum",
    title: "DreamCoin Silver Tier (3 months)",
    description: "Prepaid Silver subscription tier for 3 months. Includes unlimited messaging, 10 realm joins, and 2 profile boosts per month.",
    category: "subscription",
    price: 1400,
    currency: "DREAM",
    stock: 100,
    status: "active",
    media_ids: null,
    metadata: { rarity: "common", duration_months: 3, tier: "silver" },
    sales_count: 156,
    rating_avg: 4.2,
    rating_count: 41,
    created_at: "2025-04-15T10:00:00Z",
    updated_at: "2025-05-20T10:00:00Z",
  },
];

export function getAllListings(): SampleListing[] {
  return SAMPLE_LISTINGS;
}

export function getListingById(id: string): SampleListing | undefined {
  return SAMPLE_LISTINGS.find((l) => l.id === id);
}

export function getListingsByCategory(category: ListingCategory): SampleListing[] {
  return SAMPLE_LISTINGS.filter((l) => l.category === category);
}

export function getFeaturedListings(limit = 4): SampleListing[] {
  return SAMPLE_LISTINGS
    .filter((l) => l.status === "active" && (l.rating_avg >= 4.5 || l.sales_count >= 100))
    .slice(0, limit);
}

export function searchListings(query: string): SampleListing[] {
  const q = query.toLowerCase();
  return SAMPLE_LISTINGS.filter(
    (l) =>
      l.title.toLowerCase().includes(q) ||
      (l.description?.toLowerCase().includes(q) ?? false) ||
      l.seller_name.toLowerCase().includes(q)
  );
}

export const ALL_CATEGORIES: ListingCategory[] = [
  "avatar_item",
  "avatar_frame",
  "title",
  "badge",
  "realm_pass",
  "premium_content",
  "commission",
  "digital_good",
  "subscription",
];
