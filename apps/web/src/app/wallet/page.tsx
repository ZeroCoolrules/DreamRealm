/**
 * Wallet page — DreamCoin economy hub
 *
 * Displays balance, lifetime stats, subscription tier,
 * transaction history, and quick actions for transfers/purchases.
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import AppShell from "../components/AppShell";
import { useAuth } from "../components/AuthProvider";
import type { TransactionType } from "@dreamrealm/types";
import { TransactionHistory } from "../components/TransactionHistory";
import { TierBadge, TierFeatureList } from "../components/TierBadge";
import { SAMPLE_USERS } from "../lib/users";

export default function WalletPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"history" | "tiers" | "payouts">("history");

  // Preview with first sample user (authenticated view will use real API)
  const u = SAMPLE_USERS[0]!;

  if (!user) {
    return (
      <AppShell>
        <main className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <p className="mb-4 text-text-muted">Sign in to view your wallet</p>
            <Link
              href="/login"
              className="rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-white hover:bg-primary-dark"
            >
              Sign In
            </Link>
          </div>
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* ===== HERO: Balance + Tier ===== */}
        <div className="mb-6 overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/5 via-surface to-accent/5 p-6 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-text-muted">
                DreamCoin Balance
              </p>
              <div className="flex items-baseline gap-2">
                <h1 className="text-4xl font-bold text-glow">
                  {u.coins.toLocaleString()}
                </h1>
                <span className="text-2xl">🪙</span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <TierBadge tier={u.tier} size="sm" />
                <span className="text-[11px] text-text-muted">
                  Est. value: ${(u.coins / 100).toFixed(2)} USD
                </span>
              </div>
            </div>

            {/* Quick actions */}
            <div className="flex flex-wrap gap-2">
              <ActionButton icon="🎁" label="Tip" href="/wallet/tip" />
              <ActionButton icon="↔️" label="Send" href="/wallet/transfer" />
              <ActionButton icon="🛒" label="Buy" href="/marketplace" />
              <ActionButton icon="⭐" label="Upgrade" href="/wallet/upgrade" primary />
            </div>
          </div>
        </div>

        {/* ===== LIFETIME STATS ===== */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Lifetime Earned" value={`${u.lifetimeEarned.toLocaleString()} 🪙`} accent="text-success" />
          <StatCard label="Lifetime Spent" value={`${u.lifetimeSpent.toLocaleString()} 🪙`} accent="text-danger" />
          <StatCard label="Net Position" value={`${(u.lifetimeEarned - u.lifetimeSpent).toLocaleString()} 🪙`} accent={u.lifetimeEarned > u.lifetimeSpent ? "text-success" : "text-danger"} />
          <StatCard label="Transactions" value={`${u.transactions.length}`} accent="text-primary" />
        </div>

        {/* ===== TABS ===== */}
        <div className="mb-5 flex gap-1 rounded-xl border border-border bg-surface p-1">
          <TabButton label="📜 History" active={activeTab === "history"} onClick={() => setActiveTab("history")} />
          <TabButton label="⭐ Subscription" active={activeTab === "tiers"} onClick={() => setActiveTab("tiers")} />
          <TabButton label="💰 Payouts" active={activeTab === "payouts"} onClick={() => setActiveTab("payouts")} />
        </div>

        {/* ===== TAB CONTENT ===== */}
        {activeTab === "history" && (
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-text">Transaction History</h2>
              <Link
                href="/wallet/export"
                className="text-xs font-medium text-primary hover:text-accent transition"
              >
                Export CSV →
              </Link>
            </div>
            <TransactionHistory
              transactions={u.transactions.map((t) => ({
                id: t.id,
                wallet_id: "w-001",
                type: t.type as TransactionType,
                amount: Math.abs(t.amount),
                description: t.description,
                reference_id: null,
                reference_table: null,
                metadata: null,
                created_at: t.createdAt,
              }))}
              pageSize={8}
            />
          </section>
        )}

        {activeTab === "tiers" && (
          <section className="grid gap-5 lg:grid-cols-2">
            {/* Current tier */}
            <div className="rounded-2xl border border-border bg-surface p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-text">Current Plan</h2>
                <TierBadge tier={u.tier} size="md" />
              </div>
              <TierFeatureList tier={u.tier} />
              <div className="mt-5">
                <Link
                  href="/wallet/upgrade"
                  className="block w-full rounded-xl bg-primary py-2.5 text-center text-sm font-semibold text-white shadow-glow transition hover:bg-primary-dark"
                >
                  {u.tier === "platinum" ? "Manage Subscription" : "Upgrade Plan"}
                </Link>
              </div>
            </div>

            {/* All tiers comparison */}
            <div className="rounded-2xl border border-border bg-surface p-6">
              <h2 className="mb-4 text-lg font-bold text-text">Compare Plans</h2>
              <div className="space-y-3">
                {(["free", "silver", "gold", "platinum"] as const).map((tier) => (
                  <div
                    key={tier}
                    className={`flex items-center justify-between rounded-xl border p-3 transition ${
                      u.tier === tier
                        ? "border-primary/40 bg-primary/5"
                        : "border-border bg-surface-light"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <TierBadge tier={tier} size="sm" showLabel />
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-text">
                        {tier === "free" ? "$0/mo" : tier === "silver" ? "$4.99/mo" : tier === "gold" ? "$9.99/mo" : "$19.99/mo"}
                      </p>
                      <p className="text-[10px] text-text-muted">
                        {tier === "free" ? "Basic access" : `${tier === "silver" ? "5" : tier === "gold" ? "10" : "∞"}x boosts`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {activeTab === "payouts" && (
          <section className="rounded-2xl border border-border bg-surface p-8 text-center">
            <div className="mb-3 text-3xl">💰</div>
            <h2 className="mb-2 text-lg font-bold text-text">Creator Payouts</h2>
            <p className="mb-4 max-w-sm mx-auto text-sm text-text-muted">
              Request a withdrawal of your creator earnings to your bank account, crypto wallet, or PayPal.
            </p>
            <div className="mb-5 grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-border bg-surface-light p-3">
                <p className="text-lg font-bold text-success">{(u.lifetimeEarned * 0.6).toLocaleString()}</p>
                <p className="text-[10px] text-text-muted">Available</p>
              </div>
              <div className="rounded-xl border border-border bg-surface-light p-3">
                <p className="text-lg font-bold text-primary">$0</p>
                <p className="text-[10px] text-text-muted">Pending</p>
              </div>
              <div className="rounded-xl border border-border bg-surface-light p-3">
                <p className="text-lg font-bold text-text">{(u.lifetimeEarned * 0.4).toLocaleString()}</p>
                <p className="text-[10px] text-text-muted">Lifetime</p>
              </div>
            </div>
            <Link
              href="/wallet/payout"
              className="inline-block rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-glow transition hover:bg-primary-dark"
            >
              Request Payout
            </Link>
          </section>
        )}
      </div>
    </AppShell>
  );
}

/* ------------------------------------------------------------------ */
/* Helpers                                                               */
/* ------------------------------------------------------------------ */

function ActionButton({ icon, label, href, primary }: { icon: string; label: string; href: string; primary?: boolean }) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition ${
        primary
          ? "bg-primary text-white shadow-glow hover:bg-primary-dark"
          : "border border-border bg-surface-light text-text hover:border-primary/40 hover:text-primary"
      }`}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </Link>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4 text-center transition hover:border-primary/20">
      <p className={`text-sm font-bold ${accent}`}>{value}</p>
      <p className="mt-0.5 text-[10px] uppercase tracking-wider text-text-muted">{label}</p>
    </div>
  );
}

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition ${
        active
          ? "bg-primary/10 text-primary"
          : "text-text-muted hover:text-text"
      }`}
    >
      {label}
    </button>
  );
}
