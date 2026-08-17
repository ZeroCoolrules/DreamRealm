/**
 * PermissionEditor
 *
 * Panel for managing realm member roles and permissions.
 * Displays current members with color-coded role badges and
 * a dropdown to change each member's role.
 */

"use client";

import type { RealmPermission, RealmPermissionRole } from "@dreamrealm/types";

/** UI-enriched permission row with display-friendly name */
interface PermissionRow extends RealmPermission {
  displayName: string;
}

interface PermissionEditorProps {
  permissions: RealmPermission[];
  onChange: (updated: RealmPermission[]) => void;
}

const ROLE_STYLES: Record<RealmPermissionRole, string> = {
  owner: "bg-accent/20 text-accent border-accent/30",
  admin: "bg-primary/20 text-primary border-primary/30",
  moderator: "bg-warning/20 text-warning border-warning/30",
  member: "bg-success/20 text-success border-success/30",
  banned: "bg-danger/20 text-danger border-danger/30",
};

const ROLE_OPTIONS: { value: RealmPermissionRole; label: string }[] = [
  { value: "owner", label: "Owner" },
  { value: "admin", label: "Admin" },
  { value: "moderator", label: "Moderator" },
  { value: "member", label: "Member" },
  { value: "banned", label: "Banned" },
];

/** Shorten a UUID to a readable display name */
function shortUserId(userId: string): string {
  return `User ${userId.slice(0, 6).toUpperCase()}`;
}

export default function PermissionEditor({
  permissions,
  onChange,
}: PermissionEditorProps) {
  // Enrich rows with display names derived from user_id
  const rows: PermissionRow[] = permissions.map((p) => ({
    ...p,
    displayName: shortUserId(p.user_id),
  }));

  const handleRoleChange = (
    userId: string,
    newRole: RealmPermissionRole
  ) => {
    const updated = permissions.map((p) =>
      p.user_id === userId ? { ...p, role: newRole } : p
    );
    onChange(updated);
  };

  if (permissions.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-8 text-center">
        <p className="text-sm text-text-muted">No members yet.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <p className="text-sm font-semibold text-text">
          Members ({permissions.length})
        </p>
        <p className="text-xs text-text-muted">Manage roles below</p>
      </div>

      {/* Member rows */}
      <ul className="divide-y divide-border">
        {rows.map((row) => (
          <li
            key={row.id}
            className="flex flex-col gap-3 px-4 py-3 transition hover:bg-surface-light sm:flex-row sm:items-center sm:justify-between"
          >
            {/* Avatar + name */}
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                {row.displayName.charAt(5)}
              </div>
              <div>
                <p className="text-sm font-medium text-text">{row.displayName}</p>
                <p className="font-mono text-[10px] text-text-muted">
                  {row.user_id.slice(0, 16)}…
                </p>
              </div>
            </div>

            {/* Role badge + selector */}
            <div className="flex items-center gap-2 sm:gap-3">
              <span
                className={[
                  "rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                  ROLE_STYLES[row.role],
                ].join(" ")}
              >
                {row.role}
              </span>

              {/* Prevent owner from demoting themselves (UI guard) */}
              {row.role !== "owner" && (
                <select
                  value={row.role}
                  onChange={(e) =>
                    handleRoleChange(
                      row.user_id,
                      e.target.value as RealmPermissionRole
                    )
                  }
                  className="rounded-lg border border-border bg-surface-light px-2 py-1 text-xs text-text outline-none focus:border-primary transition"
                  aria-label={`Change role for ${row.displayName}`}
                >
                  {ROLE_OPTIONS.filter((o) => o.value !== "owner").map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
