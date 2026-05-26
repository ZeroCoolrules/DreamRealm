"use client";

import { useState } from "react";
import type { Transaction, TransactionType } from "@dreamrealm/types";

const TYPE_ICONS: Record<TransactionType, string> = {
  deposit:        "⬇️",
  withdrawal:     "⬆️",
  tip:            "🎁",
  gift:           "🎀",
  unlock:         "🔓",
  subscription:   "⭐",
  stream_payment: "📡",
  creator_payout: "💰",
  referral_bonus: "🤝",
  adjustment:     "⚙️",
};

const TYPE_COLORS: Record<TransactionType, string> = {
  deposit:        "text-success",
  withdrawal:     "text-danger",
  tip:            "text-primary",
  gift:           "text-accent",
  unlock:         "text-amber-300",
  subscription:   "text-primary",
  stream_payment: "text-accent",
  creator_payout: "text-success",
  referral_bonus: "text-success",
  adjustment:     "text-text-muted",
};

function formatAmount(amount: number, type: TransactionType): string {
  const sign =
    type === "deposit" || type === "tip" || type === "gift" || type === "referral_bonus" || type === "creator_payout"
      ? "+"
      : type === "withdrawal" || type === "subscription" || type === "stream_payment" || type === "unlock"
      ? "-"
      : "";
  return `${sign}${amount.toLocaleString()} 🪙`;
}

function formatDate(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatTime(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

interface TransactionHistoryProps {
  transactions: Transaction[];
  showFilter?: boolean;
  pageSize?: number;
}

export function TransactionHistory({ transactions, showFilter = true, pageSize = 10 }: TransactionHistoryProps) {
  const [filter, setFilter] = useState<TransactionType | "all">("all");
  const [page, setPage] = useState(1);

  const filtered = filter === "all" ? transactions : transactions.filter((t) => t.type === filter);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <div className="space-y-4">
      {showFilter && (
        <div className="flex flex-wrap gap-1.5">
          <FilterChip label="All" active={filter === "all"} onClick={() => { setFilter("all"); setPage(1); }} />
          {(Object.keys(TYPE_ICONS) as TransactionType[]).map((type) => (
            <FilterChip
              key={type}
              label={`${TYPE_ICONS[type]} ${type.replace("_", " ")}`}
              active={filter === type}
              onClick={() => { setFilter(type); setPage(1); }}
            />
          ))}
        </div>
      )}

      <div className="space-y-2">
        {paged.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface p-6 text-center">
            <p className="text-sm text-text-muted">No transactions found.</p>
          </div>
        ) : (
          paged.map((t) => (
            <div
              key={t.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 transition hover:border-primary/20"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-light text-base">
                {TYPE_ICONS[t.type]}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium capitalize text-text">
                    {t.type.replace("_", " ")}
                  </p>
                  <p className={`shrink-0 text-sm font-semibold ${TYPE_COLORS[t.type]}`}>
                    {formatAmount(t.amount, t.type)}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-2">
                  {t.description && (
                    <p className="truncate text-xs text-text-muted">{t.description}</p>
                  )}
                  <p className="shrink-0 text-[10px] text-text-muted">
                    {formatDate(t.created_at)} · {formatTime(t.created_at)}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage <= 1}
            className="rounded-lg border border-border px-3 py-1 text-xs text-text-muted hover:text-text disabled:opacity-40"
          >
            ← Prev
          </button>
          <span className="text-xs text-text-muted">
            Page {safePage} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage >= totalPages}
            className="rounded-lg border border-border px-3 py-1 text-xs text-text-muted hover:text-text disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg border px-2.5 py-1 text-[11px] font-medium transition ${
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-surface text-text-muted hover:text-text"
      }`}
    >
      {label}
    </button>
  );
}
