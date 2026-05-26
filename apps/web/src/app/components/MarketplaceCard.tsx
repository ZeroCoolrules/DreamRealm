"use client";

import Link from "next/link";
import type { SampleListing } from "../lib/marketplace";
import { getCategoryIcon, getCategoryLabel, getRarityStyle } from "../lib/marketplace";

interface MarketplaceCardProps {
  listing: SampleListing;
}

export function MarketplaceCard({ listing }: MarketplaceCardProps) {
  const rarity = (listing.metadata as { rarity?: string } | null)?.rarity ?? "common";
  const isLowStock = listing.stock <= 5 && listing.stock > 0;
  const isSoldOut = listing.stock === 0;

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border border-border bg-surface transition hover:border-primary/30 ${
        isSoldOut ? "opacity-60" : ""
      }`}
    >
      {/* Image / placeholder */}
      <Link href={`/marketplace/${listing.id}`} className="block">
        <div className="relative flex h-40 items-center justify-center bg-gradient-to-br from-surface-light to-surface">
          <span className="text-4xl">{getCategoryIcon(listing.category)}</span>

          {/* Rarity badge */}
          <div className="absolute left-3 top-3">
            <span className={`rounded-lg border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${getRarityStyle(rarity)}`}>
              {rarity}
            </span>
          </div>

          {/* Stock badge */}
          {isLowStock && (
            <div className="absolute right-3 top-3">
              <span className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                Only {listing.stock} left
              </span>
            </div>
          )}
          {isSoldOut && (
            <div className="absolute inset-0 flex items-center justify-center bg-surface/80">
              <span className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-1 text-xs font-semibold text-danger">
                Sold Out
              </span>
            </div>
          )}
        </div>
      </Link>

      {/* Content */}
      <div className="p-4">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
            {getCategoryIcon(listing.category)} {getCategoryLabel(listing.category)}
          </span>
          <div className="flex items-center gap-1">
            <svg className="h-3.5 w-3.5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span className="text-[10px] font-medium text-text-muted">
              {listing.rating_avg} ({listing.rating_count})
            </span>
          </div>
        </div>

        <Link href={`/marketplace/${listing.id}`}>
          <h3 className="mb-1 text-sm font-semibold text-text transition group-hover:text-primary truncate">
            {listing.title}
          </h3>
        </Link>

        <p className="mb-3 line-clamp-2 text-xs text-text-muted">{listing.description}</p>

        {/* Seller */}
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">
            {listing.seller_name.charAt(0)}
          </div>
          <span className="text-[11px] text-text-muted truncate">{listing.seller_name}</span>
        </div>

        {/* Price + Action */}
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-bold text-primary">{listing.price.toLocaleString()}</span>
            <span className="text-xs text-text-muted">🪙</span>
          </div>

          {!isSoldOut ? (
            <Link
              href={`/marketplace/${listing.id}`}
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white shadow-glow transition hover:bg-primary-dark"
            >
              View
            </Link>
          ) : (
            <span className="rounded-lg border border-border bg-surface-light px-3 py-1.5 text-xs font-medium text-text-muted">
              Unavailable
            </span>
          )}
        </div>

        {/* Sales count */}
        <p className="mt-2 text-[10px] text-text-muted">
          {listing.sales_count.toLocaleString()} sold
        </p>
      </div>
    </div>
  );
}
