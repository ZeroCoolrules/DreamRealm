/**
 * NPC Directory
 *
 * Browse all AI NPCs in the DreamRealm. Filter by role, search by name or
 * personality trait. View mood, backstory previews, and interaction stats.
 */

"use client";

import { useState } from "react";
import AppShell from "../components/AppShell";
import { NPCCard } from "../components/NPCCard";
import {
  getAllNPCs,
  getFeaturedNPCs,
  searchNPCs,
  getRoleStyle,
  getRoleLabel,
  ALL_ROLES,
} from "../lib/npcs";
import type { NPCRole } from "@dreamrealm/types";

export default function NPCDirectoryPage() {
  const [search, setSearch] = useState("");
  const [activeRole, setActiveRole] = useState<NPCRole | "all">("all");

  const allNPCs = getAllNPCs();
  const featured = getFeaturedNPCs(3);

  let displayed = activeRole === "all" ? allNPCs : allNPCs.filter((n) => n.role === activeRole);
  if (search.trim()) {
    displayed = searchNPCs(search);
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Hero */}
        <div className="mb-8 overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/5 via-surface to-accent/5 p-6 sm:p-8">
          <div>
            <h1 className="text-2xl font-bold text-text">AI Companions</h1>
            <p className="text-sm text-text-muted">
              Meet the persistent spirits of the DreamRealm. Each has a unique personality, memory, and purpose.
            </p>
          </div>
        </div>

        {/* Search + Roles */}
        <div className="mb-6 space-y-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search by name, role, or personality trait..."
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
            <RoleChip
              label="All"
              active={activeRole === "all"}
              onClick={() => setActiveRole("all")}
            />
            {ALL_ROLES.map((role) => (
              <RoleChip
                key={role}
                label={getRoleLabel(role)}
                active={activeRole === role}
                onClick={() => setActiveRole(role)}
                styleClass={getRoleStyle(role)}
              />
            ))}
          </div>
        </div>

        {/* Featured */}
        {featured.length > 0 && activeRole === "all" && !search.trim() && (
          <section className="mb-8">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-text-muted">Most Popular</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((npc) => (
                <NPCCard key={npc.id} npc={npc} />
              ))}
            </div>
          </section>
        )}

        {/* All NPCs */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-text-muted">
              {search.trim() ? `Results (${displayed.length})` : activeRole === "all" ? "All Companions" : getRoleLabel(activeRole)}
            </h2>
            <span className="text-xs text-text-muted">{displayed.length} NPCs</span>
          </div>

          {displayed.length === 0 ? (
            <div className="rounded-2xl border border-border bg-surface p-12 text-center">
              <p className="mb-2 text-lg">🔮</p>
              <p className="text-sm text-text-muted">No companions found.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {displayed.map((npc) => (
                <NPCCard key={npc.id} npc={npc} />
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function RoleChip({
  label,
  active,
  onClick,
  styleClass,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  styleClass?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg border px-3 py-1.5 text-[11px] font-medium transition ${
        active
          ? styleClass
            ? `${styleClass} ring-1 ring-primary/50`
            : "border-primary bg-primary/10 text-primary"
          : "border-border bg-surface text-text-muted hover:text-text"
      }`}
    >
      {label}
    </button>
  );
}
