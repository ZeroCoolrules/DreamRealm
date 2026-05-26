/**
 * NPCCard
 *
 * NPC preview card for the directory grid.
 * Displays avatar placeholder, role badge, mood, personality traits,
 * interaction count, and a brief description.
 */

"use client";

import Link from "next/link";
import type { SampleNPC } from "../lib/npcs";
import { getRoleStyle, getRoleLabel, getMoodEmoji } from "../lib/npcs";

interface NPCCardProps {
  npc: SampleNPC;
}

export function NPCCard({ npc }: NPCCardProps) {
  return (
    <Link
      href={`/npcs/${npc.slug}`}
      className="group relative overflow-hidden rounded-2xl border border-border bg-surface transition hover:border-primary/30"
    >
      {/* Header / Avatar area */}
      <div className="relative flex h-32 items-center justify-center bg-gradient-to-br from-surface-light to-surface">
        <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-primary/20 bg-primary/10 text-4xl shadow-glow transition group-hover:scale-110">
          {getMoodEmoji(npc.mood)}
        </div>

        {/* Role badge */}
        <div className="absolute left-3 top-3">
          <span className={`rounded-lg border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${getRoleStyle(npc.role)}`}>
            {getRoleLabel(npc.role)}
          </span>
        </div>

        {/* Mood badge */}
        <div className="absolute right-3 top-3">
          <span className="rounded-lg border border-border bg-surface-light px-2 py-0.5 text-[10px] text-text-muted capitalize">
            {getMoodEmoji(npc.mood)} {npc.mood}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="mb-1 text-base font-bold text-text transition group-hover:text-primary">
          {npc.name}
        </h3>

        <p className="mb-3 line-clamp-2 text-xs text-text-muted">
          {npc.description}
        </p>

        {/* Traits */}
        <div className="mb-3 flex flex-wrap gap-1">
          {npc.personality_traits.slice(0, 4).map((trait) => (
            <span
              key={trait}
              className="rounded border border-border bg-surface-light px-1.5 py-0.5 text-[10px] capitalize text-text-muted"
            >
              {trait}
            </span>
          ))}
        </div>

        {/* Footer stats */}
        <div className="flex items-center justify-between border-t border-border pt-3">
          <span className="text-[10px] text-text-muted">
            {npc.interaction_count.toLocaleString()} interactions
          </span>
          <span className="rounded-lg bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
            Chat →
          </span>
        </div>
      </div>
    </Link>
  );
}
