/**
 * PresenceIndicator
 *
 * A small colored dot with optional label indicating a user's
 * online status. Used throughout chat and friend lists.
 */

"use client";

export type PresenceStatus = "online" | "away" | "busy" | "offline";

interface PresenceIndicatorProps {
  status: PresenceStatus;
  size?: "sm" | "md";
  showLabel?: boolean;
}

const STATUS_CONFIG: Record<
  PresenceStatus,
  { color: string; label: string; ringColor: string }
> = {
  online: { color: "bg-success", label: "Online", ringColor: "ring-success/30" },
  away: { color: "bg-warning", label: "Away", ringColor: "ring-warning/30" },
  busy: { color: "bg-danger", label: "Busy", ringColor: "ring-danger/30" },
  offline: { color: "bg-text-muted", label: "Offline", ringColor: "ring-text-muted/20" },
};

export default function PresenceIndicator({
  status,
  size = "sm",
  showLabel = false,
}: PresenceIndicatorProps) {
  const config = STATUS_CONFIG[status];

  const dotSize = size === "md" ? "h-3 w-3" : "h-2 w-2";

  return (
    <span className="flex items-center gap-1.5">
      <span
        className={`${dotSize} rounded-full ${config.color} ring-2 ${config.ringColor} shrink-0 transition-colors`}
        aria-label={config.label}
        role="status"
      />
      {showLabel && (
        <span className="text-xs text-text-muted">{config.label}</span>
      )}
    </span>
  );
}
