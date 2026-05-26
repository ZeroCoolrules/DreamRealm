/**
 * Marketplace storefront
 *
 * Browse digital goods, avatar items, realm passes, commissions,
 * and premium subscriptions with category filters and search.
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import AppShell from "../components/AppShell";
import { useAuth } from "../components/AuthProvider";
import { MarketplaceCard } from "../components/MarketplaceCard";
import {
  getAllListings,
  getFeaturedListings,
  searchListings,
  getCategoryIcon,
  getCategoryLabel,
  ALL_CATEGORIES,
} from "../lib/marketplace";
import type { ListingCategory } from "@dreamrealm/types";

export default function MarketplacePage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<ListingCategory | "all">("all");

  const allListings = getAllListings();
  const featured = getFeaturedListings(3);

  let displayed = activeCategory === "all" ? allListings : allListings.filter((l) => l.category === activeCategory);
  if (search.trim()) {
    displayed = searchListings(search);
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* ===== HERO ===== */}
        <div className="mb-8 overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/5 via-surface to-accent/5 p-6 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-text">Marketplace</h1>
              <p className="text-sm text-text-muted">
                Buy, sell, and trade digital goods with DreamCoin.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {user && (
                <Link
                  href="/marketplace/create"
                  className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white shadow-glow transition hover:bg-primary-dark"
                >
                  + List Item
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* ===== SEARCH + CATEGORIES ===== */}
        <div className="mb-6 space-y-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search items, sellers, categories..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface-light px-4 py-2.5 text-sm text-text placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-text-muted hover:text-text"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5">
            <CategoryChip
              label="All"
              active={activeCategory === "all"}
              onClick={() => setActiveCategory("all")}
            />
            {ALL_CATEGORIES.map((cat) => (
              <CategoryChip
                key={cat}
                label={`${getCategoryIcon(cat)} ${getCategoryLabel(cat)}`}
                active={activeCategory === cat}
                onClick={() => setActiveCategory(cat)}
              />
            ))}
          </div>
        </div>

        {/* ===== FEATURED ===== */}
        {featured.length > 0 && activeCategory === "all" && !search.trim() && (
          <section className="mb-8">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-text-muted">Featured</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((l) => (
                <MarketplaceCard key={l.id} listing={l} />
              ))}
            </div>
          </section>
        )}

        {/* ===== ALL LISTINGS ===== */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-text-muted">
              {search.trim() ? `Results (${displayed.length})` : activeCategory === "all" ? "All Items" : getCategoryLabel(activeCategory)}
            </h2>
            <span className="text-xs text-text-muted">{displayed.length} items</span>
          </div>

          {displayed.length === 0 ? (
            <div className="rounded-2xl border border-border bg-surface p-12 text-center">
              <p className="mb-2 text-lg">🔍</p>
              <p className="text-sm text-text-muted">No items found.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {displayed.map((l) => (
                <MarketplaceCard key={l.id} listing={l} />
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function CategoryChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg border px-3 py-1.5 text-[11px] font-medium transition ${
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-surface text-text-muted hover:text-text"
      }`}
    >
      {label}
    </button>
  );
}
