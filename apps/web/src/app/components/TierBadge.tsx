"use client";

import type { SubscriptionTier } from "@dreamrealm/types";

const TIER_STYLES: Record<SubscriptionTier, string> = {
  free:     "bg-surface-light border-border text-text-muted",
  silver:   "bg-slate-700/20 border-slate-500/40 text-slate-300",
  gold:     "bg-amber-500/10 border-amber-500/40 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.15)]",
  platinum: "bg-gradient-to-r from-primary/20 to-accent/20 border-primary/40 text-primary shadow-glow",
};

const TIER_ICONS: Record<SubscriptionTier, string> = {
  free:     "⚪",
  silver:   "🥈",
  gold:     "🥇",
  platinum: "💎",
};

const TIER_LABELS: Record<SubscriptionTier, string> = {
  free:     "Free",
  silver:   "Silver",
  gold:     "Gold",
  platinum: "Platinum",
};

interface TierBadgeProps {
  tier: SubscriptionTier;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export function TierBadge({ tier, size = "md", showLabel = true }: TierBadgeProps) {
  const sizeClasses = {
    sm: "px-2 py-0.5 text-[10px] gap-1 rounded-md",
    md: "px-2.5 py-1 text-xs gap-1.5 rounded-lg",
    lg: "px-3 py-1.5 text-sm gap-2 rounded-xl",
  };

  return (
    <span
      className={`inline-flex items-center border font-semibold uppercase tracking-wider ${sizeClasses[size]} ${TIER_STYLES[tier]}`}
    >
      <span>{TIER_ICONS[tier]}</span>
      {showLabel && <span>{TIER_LABELS[tier]}</span>}
    </span>
  );
}

interface TierFeatureListProps {
  tier: SubscriptionTier;
}

const TIER_FEATURES: Record<SubscriptionTier, string[]> = {
  free: [
    "Basic profile and matching",
    "5 messages per day",
    "1 realm join",
    "Standard support",
  ],
  silver: [
    "Unlimited messaging",
    "10 realm joins",
    "Profile boosts (2/mo)",
    "Priority support",
    "Ad-free browsing",
  ],
  gold: [
    "Everything in Silver",
    "Unlimited realm joins",
    "Profile boosts (10/mo)",
    "VIP badge",
    "Advanced search filters",
    "Early access to features",
  ],
  platinum: [
    "Everything in Gold",
    "Unlimited boosts",
    "Creator tools unlocked",
    "Revenue share eligibility",
    "Concierge support",
    "Exclusive Platinum events",
  ],
};

export function TierFeatureList({ tier }: TierFeatureListProps) {
  const features = TIER_FEATURES[tier];
  return (
    <ul className="space-y-2">
      {features.map((f) => (
        <li key={f} className="flex items-start gap-2 text-sm text-text-muted">
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-success" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          {f}
        </li>
      ))}
    </ul>
  );
}
