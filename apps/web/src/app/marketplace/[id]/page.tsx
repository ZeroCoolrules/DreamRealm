/**
 * Marketplace listing detail page
 *
 * Shows full item details, seller info, reviews, purchase flow,
 * and related items. Includes wallet balance check before purchase.
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import AppShell from "../../components/AppShell";
import { getListingById, getAllListings, getCategoryIcon, getCategoryLabel, getRarityStyle } from "../../lib/marketplace";
import { SAMPLE_USERS } from "../../lib/users";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ListingDetailPage({ params }: PageProps) {
  const [listingId, setListingId] = useState<string | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);

  // Resolve params
  params.then(({ id }) => setListingId(id)).catch(() => setListingId(""));

  // Preview with first sample user for balance check
  const wallet = SAMPLE_USERS[0]!;

  if (listingId === null) return <LoadingView />;

  const listing = getListingById(listingId);
  if (!listing) return <NotFoundView />;

  const rarity = (listing.metadata as { rarity?: string } | null)?.rarity ?? "common";
  const totalPrice = listing.price * quantity;
  const canAfford = wallet.coins >= totalPrice;
  const related = getAllListings()
    .filter((l) => l.category === listing.category && l.id !== listing.id)
    .slice(0, 3);

  const handlePurchase = async () => {
    setError(null);
    if (!canAfford) {
      setError("Insufficient DreamCoin balance. Visit your wallet to top up.");
      return;
    }
    setIsPurchasing(true);
    // Simulate purchase
    await new Promise((r) => setTimeout(r, 1500));
    setIsPurchasing(false);
    setPurchaseSuccess(true);
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl px-4 py-8">
        {/* Breadcrumb */}
        <div className="mb-4 flex items-center gap-2 text-xs text-text-muted">
          <Link href="/marketplace" className="hover:text-primary transition">Marketplace</Link>
          <span>›</span>
          <span className="truncate">{listing.title}</span>
        </div>

        <div className="grid gap-8 lg:grid-cols-5">
          {/* Left: Image + meta */}
          <div className="lg:col-span-3">
            <div className="mb-6 overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-surface-light to-surface p-12 text-center">
              <span className="text-7xl">{getCategoryIcon(listing.category)}</span>
            </div>

            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className={`rounded-lg border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${getRarityStyle(rarity)}`}>
                {rarity}
              </span>
              <span className="rounded-lg border border-border bg-surface-light px-2.5 py-1 text-[10px] text-text-muted">
                {getCategoryIcon(listing.category)} {getCategoryLabel(listing.category)}
              </span>
              <span className={`rounded-lg px-2.5 py-1 text-[10px] font-semibold ${listing.stock > 0 ? "bg-success/10 text-success" : "bg-danger/10 text-danger"}`}>
                {listing.stock > 0 ? `${listing.stock} in stock` : "Sold Out"}
              </span>
            </div>

            <h1 className="mb-3 text-2xl font-bold text-text">{listing.title}</h1>
            <p className="mb-6 text-sm leading-relaxed text-text-muted">{listing.description}</p>

            {/* Metadata */}
            {listing.metadata && Object.keys(listing.metadata).length > 0 && (
              <div className="mb-6 rounded-2xl border border-border bg-surface p-5">
                <h3 className="mb-3 text-sm font-bold text-text">Details</h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {Object.entries(listing.metadata)
                    .filter(([k]) => k !== "rarity")
                    .map(([key, value]) => (
                      <div key={key} className="flex justify-between text-sm">
                        <span className="text-text-muted capitalize">{key.replace("_", " ")}</span>
                        <span className="text-text font-medium">
                          {Array.isArray(value) ? value.join(", ") : String(value)}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Rating */}
            <div className="mb-6 flex items-center gap-3">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <svg
                    key={star}
                    className={`h-4 w-4 ${star <= Math.round(listing.rating_avg) ? "text-amber-400" : "text-surface-light"}`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <span className="text-sm font-semibold text-text">{listing.rating_avg}</span>
              <span className="text-xs text-text-muted">({listing.rating_count} reviews) · {listing.sales_count} sold</span>
            </div>
          </div>

          {/* Right: Purchase panel */}
          <div className="lg:col-span-2">
            <div className="sticky top-24 rounded-2xl border border-border bg-surface p-6">
              <div className="mb-4 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-primary">{listing.price.toLocaleString()}</span>
                <span className="text-sm text-text-muted">🪙</span>
              </div>

              {/* Seller */}
              <div className="mb-4 flex items-center gap-3 rounded-xl border border-border bg-surface-light p-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-sm font-bold text-primary">
                  {listing.seller_name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-semibold text-text">{listing.seller_name}</p>
                  <p className="text-[10px] text-text-muted">{listing.seller_tier} seller</p>
                </div>
              </div>

              {/* Quantity */}
              {listing.stock > 0 && (
                <div className="mb-4">
                  <label className="mb-1.5 block text-xs font-medium text-text-muted">Quantity</label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="h-9 w-9 rounded-lg border border-border bg-surface-light text-sm font-semibold text-text hover:bg-surface"
                    >
                      −
                    </button>
                    <span className="w-8 text-center text-sm font-semibold text-text">{quantity}</span>
                    <button
                      onClick={() => setQuantity((q) => Math.min(listing.stock, q + 1))}
                      className="h-9 w-9 rounded-lg border border-border bg-surface-light text-sm font-semibold text-text hover:bg-surface"
                    >
                      +
                    </button>
                  </div>
                </div>
              )}

              {/* Total */}
              <div className="mb-4 flex items-center justify-between border-t border-border pt-3">
                <span className="text-sm text-text-muted">Total</span>
                <span className="text-lg font-bold text-text">{totalPrice.toLocaleString()} 🪙</span>
              </div>

              {/* Balance */}
              <div className={`mb-4 rounded-lg border px-3 py-2 text-xs ${canAfford ? "border-success/30 bg-success/5 text-success" : "border-danger/30 bg-danger/5 text-danger"}`}>
                Your balance: {wallet.coins.toLocaleString()} 🪙
                {!canAfford && " — Insufficient funds"}
              </div>

              {/* Actions */}
              {listing.stock > 0 ? (
                <>
                  <button
                    onClick={() => setShowPurchaseModal(true)}
                    disabled={!canAfford}
                    className="mb-2 w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-white shadow-glow transition hover:bg-primary-dark disabled:opacity-40 disabled:shadow-none"
                  >
                    {canAfford ? "Buy Now" : "Not Enough Coins"}
                  </button>
                  <Link
                    href={`/users/${listing.seller_id}`}
                    className="block w-full rounded-xl border border-border bg-surface-light py-2.5 text-center text-sm font-medium text-text transition hover:border-primary/40 hover:text-primary"
                  >
                    View Seller Profile
                  </Link>
                </>
              ) : (
                <button
                  disabled
                  className="w-full rounded-xl border border-border bg-surface-light py-2.5 text-sm font-medium text-text-muted opacity-60"
                >
                  Sold Out
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Related items */}
        {related.length > 0 && (
          <section className="mt-12">
            <h2 className="mb-4 text-lg font-bold text-text">Related Items</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((l) => (
                <RelatedCard key={l.id} listing={l} />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Purchase Modal */}
      {showPurchaseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface/80 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-xl">
            {!purchaseSuccess ? (
              <>
                <h3 className="mb-1 text-lg font-bold text-text">Confirm Purchase</h3>
                <p className="mb-4 text-sm text-text-muted">
                  You are about to buy <span className="font-semibold text-text">{listing.title}</span> from {listing.seller_name}.
                </p>

                <div className="mb-4 space-y-2 rounded-xl border border-border bg-surface-light p-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-text-muted">Item price</span>
                    <span>{listing.price.toLocaleString()} 🪙</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Quantity</span>
                    <span>{quantity}</span>
                  </div>
                  <div className="border-t border-border pt-2 flex justify-between font-semibold text-text">
                    <span>Total</span>
                    <span>{totalPrice.toLocaleString()} 🪙</span>
                  </div>
                </div>

                {error && (
                  <p className="mb-3 text-xs text-danger">{error}</p>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowPurchaseModal(false); setError(null); setQuantity(1); }}
                    className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium text-text transition hover:bg-surface-light"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePurchase}
                    disabled={isPurchasing}
                    className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white shadow-glow transition hover:bg-primary-dark disabled:opacity-60"
                  >
                    {isPurchasing ? "Processing..." : "Confirm"}
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center">
                <div className="mb-3 text-4xl">🎉</div>
                <h3 className="mb-1 text-lg font-bold text-text">Purchase Complete!</h3>
                <p className="mb-4 text-sm text-text-muted">
                  You bought {listing.title} for {totalPrice.toLocaleString()} 🪙.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowPurchaseModal(false); setPurchaseSuccess(false); setQuantity(1); }}
                    className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium text-text transition hover:bg-surface-light"
                  >
                    Continue Shopping
                  </button>
                  <Link
                    href="/wallet"
                    className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white shadow-glow transition hover:bg-primary-dark text-center"
                    onClick={() => { setShowPurchaseModal(false); setPurchaseSuccess(false); }}
                  >
                    View Wallet
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}

function LoadingView() {
  return (
    <AppShell>
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="flex min-h-[40vh] items-center justify-center">
          <p className="text-text-muted">Loading...</p>
        </div>
      </div>
    </AppShell>
  );
}

function NotFoundView() {
  return (
    <AppShell>
      <div className="mx-auto max-w-5xl px-4 py-8 text-center">
        <p className="mb-4 text-lg">🔍</p>
        <h1 className="mb-2 text-xl font-bold text-text">Listing Not Found</h1>
        <p className="mb-6 text-sm text-text-muted">This item may have been removed or sold out.</p>
        <Link
          href="/marketplace"
          className="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-glow transition hover:bg-primary-dark"
        >
          Back to Marketplace
        </Link>
      </div>
    </AppShell>
  );
}

function RelatedCard({ listing }: { listing: ReturnType<typeof getAllListings>[number] }) {
  const rarity = (listing.metadata as { rarity?: string } | null)?.rarity ?? "common";
  return (
    <Link
      href={`/marketplace/${listing.id}`}
      className="group flex gap-4 rounded-xl border border-border bg-surface p-4 transition hover:border-primary/30"
    >
      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-surface-light to-surface text-2xl">
        {getCategoryIcon(listing.category)}
      </div>
      <div className="min-w-0 flex-1">
        <h4 className="truncate text-sm font-semibold text-text group-hover:text-primary transition">
          {listing.title}
        </h4>
        <p className="mb-1 text-xs text-text-muted">{listing.seller_name}</p>
        <div className="flex items-center gap-2">
          <span className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${getRarityStyle(rarity)}`}>
            {rarity}
          </span>
          <span className="text-xs font-semibold text-primary">{listing.price.toLocaleString()} 🪙</span>
        </div>
      </div>
    </Link>
  );
}
