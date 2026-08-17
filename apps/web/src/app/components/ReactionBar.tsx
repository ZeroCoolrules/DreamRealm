/**
 * ReactionBar
 *
 * Displays a horizontal row of emoji reaction buttons below a message.
 * Each button shows the emoji and its current count. Highlighted when
 * the current user has already reacted with that emoji.
 */

"use client";

export interface ReactionItem {
  emoji: string;
  count: number;
  isMine: boolean;
}

interface ReactionBarProps {
  /** Current reactions to display */
  reactions: ReactionItem[];
  /** Called when the user clicks a reaction button */
  onReact: (emoji: string) => void;
}

const QUICK_EMOJIS = ["❤️", "👍", "😂", "🔥", "👎"];

export default function ReactionBar({ reactions, onReact }: ReactionBarProps) {
  // Build a lookup for quick access
  const reactionMap = new Map<string, ReactionItem>(
    reactions.map((r) => [r.emoji, r])
  );

  return (
    <div className="flex flex-wrap items-center gap-1 pt-1">
      {QUICK_EMOJIS.map((emoji) => {
        const reaction = reactionMap.get(emoji);
        const count = reaction?.count ?? 0;
        const isMine = reaction?.isMine ?? false;

        return (
          <button
            key={emoji}
            onClick={() => onReact(emoji)}
            aria-label={`React with ${emoji}${count > 0 ? `, ${count} reactions` : ""}`}
            aria-pressed={isMine}
            className={`flex items-center gap-0.5 rounded-full border px-2 py-0.5 text-xs transition-all duration-150 hover:scale-110 active:scale-95 ${
              isMine
                ? "border-primary bg-primary/20 text-primary shadow-glow"
                : "border-border bg-surface text-text-muted hover:border-primary/50 hover:bg-surface-light hover:text-text"
            }`}
          >
            <span>{emoji}</span>
            {count > 0 && (
              <span className={isMine ? "text-primary" : "text-text-muted"}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
