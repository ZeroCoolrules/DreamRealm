/**
 * Realm Management Dashboard
 *
 * Admin interface for realm owners. 5 tabs:
 *  Overview   — member count, status, activity summary
 *  Assets     — list of realm assets with type badges
 *  Permissions — PermissionEditor with sample members
 *  Settings   — featured toggle, archive/unarchive
 *  Analytics  — placeholder stat cards
 */

"use client";

import { notFound } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import AppShell from "../../../components/AppShell";
import PermissionEditor from "../../../components/PermissionEditor";
import { getRealmBySlug } from "../../../lib/realms";
import type { RealmPermission, RealmAsset, RealmAssetType } from "@dreamrealm/types";

// ---------------------------------------------------------------------------
// Sample data (replaces real API calls until backend is wired)
// ---------------------------------------------------------------------------

const SAMPLE_PERMISSIONS: RealmPermission[] = [
  {
    id: "perm-0001-0000-0000-000000000001",
    realm_id: "realm-0000-0000-0000-000000000001",
    user_id: "a1b2c3d4-e5f6-7890-abcd-ef1234560001",
    role: "owner",
    permissions: null,
    joined_at: "2024-01-15T00:00:00Z",
    updated_at: "2024-01-15T00:00:00Z",
  },
  {
    id: "perm-0001-0000-0000-000000000002",
    realm_id: "realm-0000-0000-0000-000000000001",
    user_id: "b2c3d4e5-f6a7-8901-bcde-f12345670002",
    role: "admin",
    permissions: null,
    joined_at: "2024-02-01T00:00:00Z",
    updated_at: "2024-02-01T00:00:00Z",
  },
  {
    id: "perm-0001-0000-0000-000000000003",
    realm_id: "realm-0000-0000-0000-000000000001",
    user_id: "c3d4e5f6-a7b8-9012-cdef-123456780003",
    role: "moderator",
    permissions: null,
    joined_at: "2024-03-10T00:00:00Z",
    updated_at: "2024-03-10T00:00:00Z",
  },
  {
    id: "perm-0001-0000-0000-000000000004",
    realm_id: "realm-0000-0000-0000-000000000001",
    user_id: "d4e5f6a7-b8c9-0123-def1-234567890004",
    role: "member",
    permissions: null,
    joined_at: "2024-04-05T00:00:00Z",
    updated_at: "2024-04-05T00:00:00Z",
  },
  {
    id: "perm-0001-0000-0000-000000000005",
    realm_id: "realm-0000-0000-0000-000000000001",
    user_id: "e5f6a7b8-c9d0-1234-ef12-345678900005",
    role: "banned",
    permissions: null,
    joined_at: "2024-05-20T00:00:00Z",
    updated_at: "2024-05-20T00:00:00Z",
  },
];

const SAMPLE_ASSETS: RealmAsset[] = [
  {
    id: "asset-0001",
    realm_id: "realm-0001",
    asset_type: "image" as RealmAssetType,
    url: "https://cdn.dreamrealm.app/realms/banner.jpg",
    thumbnail_url: null,
    metadata: { width: 1920, height: 1080 },
    sort_order: 0,
    created_by: "a1b2c3d4-e5f6-7890-abcd-ef1234560001",
    created_at: "2024-01-15T00:00:00Z",
    updated_at: "2024-01-15T00:00:00Z",
  },
  {
    id: "asset-0002",
    realm_id: "realm-0001",
    asset_type: "audio" as RealmAssetType,
    url: "https://cdn.dreamrealm.app/realms/ambient.mp3",
    thumbnail_url: null,
    metadata: { duration_s: 180 },
    sort_order: 1,
    created_by: "a1b2c3d4-e5f6-7890-abcd-ef1234560001",
    created_at: "2024-01-20T00:00:00Z",
    updated_at: "2024-01-20T00:00:00Z",
  },
  {
    id: "asset-0003",
    realm_id: "realm-0001",
    asset_type: "model" as RealmAssetType,
    url: "https://cdn.dreamrealm.app/realms/portal.glb",
    thumbnail_url: "https://cdn.dreamrealm.app/realms/portal_thumb.png",
    metadata: { poly_count: 4200 },
    sort_order: 2,
    created_by: "b2c3d4e5-f6a7-8901-bcde-f12345670002",
    created_at: "2024-02-01T00:00:00Z",
    updated_at: "2024-02-01T00:00:00Z",
  },
  {
    id: "asset-0004",
    realm_id: "realm-0001",
    asset_type: "script" as RealmAssetType,
    url: "https://cdn.dreamrealm.app/realms/spawn_logic.js",
    thumbnail_url: null,
    metadata: null,
    sort_order: 3,
    created_by: "b2c3d4e5-f6a7-8901-bcde-f12345670002",
    created_at: "2024-02-10T00:00:00Z",
    updated_at: "2024-02-10T00:00:00Z",
  },
];

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TABS = ["Overview", "Assets", "Permissions", "Settings", "Analytics"] as const;
type Tab = (typeof TABS)[number];

const ASSET_TYPE_COLORS: Record<RealmAssetType, string> = {
  image: "bg-primary/20 text-primary",
  video: "bg-accent/20 text-accent",
  audio: "bg-warning/20 text-warning",
  model: "bg-success/20 text-success",
  script: "bg-danger/20 text-danger",
  spawn_point: "bg-primary/20 text-primary",
  voice_zone: "bg-accent/20 text-accent",
};

const STATUS_BADGE: Record<string, string> = {
  active: "bg-success/20 text-success",
  beta: "bg-warning/20 text-warning",
  archived: "bg-text-muted/20 text-text-muted",
  private: "bg-danger/20 text-danger",
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function RealmManagePage({
  params,
}: {
  params: { id: string };
}) {
  const realm = getRealmBySlug(params.id);
  if (!realm) notFound();

  const [activeTab, setActiveTab] = useState<Tab>("Overview");
  const [permissions, setPermissions] = useState<RealmPermission[]>(SAMPLE_PERMISSIONS);
  const [isFeatured, setIsFeatured] = useState(realm.is_featured);
  const [isArchived, setIsArchived] = useState(realm.status === "archived");
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl px-4 py-8">
        {/* Breadcrumb */}
        <div className="mb-6 flex items-center gap-2 text-sm text-text-muted">
          <Link href="/realms" className="hover:text-primary transition">
            Realms
          </Link>
          <span>/</span>
          <Link
            href={`/realms/${realm.slug}`}
            className="hover:text-primary transition"
          >
            {realm.name}
          </Link>
          <span>/</span>
          <span className="text-text">Manage</span>
        </div>

        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-glow">{realm.name}</h1>
            <div className="mt-1 flex items-center gap-2">
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_BADGE[realm.status]}`}
              >
                {isArchived ? "archived" : realm.status}
              </span>
              <span className="text-xs text-text-muted">{realm.category}</span>
            </div>
          </div>
          <Link
            href={`/realms/${realm.slug}`}
            className="rounded-xl border border-border px-4 py-2 text-sm text-text hover:bg-surface-light transition"
          >
            View Realm ↗
          </Link>
        </div>

        {/* Tab navigation */}
        <div className="mb-6 flex gap-1 overflow-x-auto rounded-xl border border-border bg-surface p-1">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={[
                "flex-1 rounded-lg px-3 py-2 text-xs font-semibold whitespace-nowrap transition",
                activeTab === tab
                  ? "bg-primary text-white shadow-glow"
                  : "text-text-muted hover:bg-surface-light hover:text-text",
              ].join(" ")}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* TAB: Overview                                                     */}
        {/* ---------------------------------------------------------------- */}
        {activeTab === "Overview" && (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-border bg-surface p-5 text-center">
                <p className="text-3xl font-bold text-text">
                  {realm.member_count.toLocaleString()}
                </p>
                <p className="text-xs text-text-muted">Total Members</p>
              </div>
              <div className="rounded-2xl border border-border bg-surface p-5 text-center">
                <p className="text-3xl font-bold text-text">
                  {SAMPLE_ASSETS.length}
                </p>
                <p className="text-xs text-text-muted">Assets Uploaded</p>
              </div>
              <div className="rounded-2xl border border-border bg-surface p-5 text-center">
                <p className="text-3xl font-bold text-text">
                  {SAMPLE_PERMISSIONS.length}
                </p>
                <p className="text-xs text-text-muted">Members Managed</p>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-surface p-6">
              <h3 className="mb-4 font-semibold text-text">Activity Feed</h3>
              <div className="space-y-3">
                {[
                  { icon: "👥", text: "12 new members joined this week" },
                  { icon: "💬", text: "348 messages sent in the last 7 days" },
                  { icon: "🎉", text: "2 events hosted last month" },
                  { icon: "⭐", text: "Featured in Explore for 3 days" },
                ].map((item) => (
                  <div key={item.text} className="flex items-start gap-3">
                    <span className="mt-0.5 text-lg">{item.icon}</span>
                    <p className="text-sm text-text-muted">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* TAB: Assets                                                       */}
        {/* ---------------------------------------------------------------- */}
        {activeTab === "Assets" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-text-muted">
                {SAMPLE_ASSETS.length} assets in this realm
              </p>
              <button
                type="button"
                className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white shadow-glow hover:bg-primary/90 transition"
              >
                + Add Assets
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {SAMPLE_ASSETS.map((asset) => (
                <div
                  key={asset.id}
                  className="flex items-start gap-3 rounded-2xl border border-border bg-surface p-4 hover:bg-surface-light transition"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-light text-lg">
                    {asset.asset_type === "image" && "🖼️"}
                    {asset.asset_type === "video" && "🎬"}
                    {asset.asset_type === "audio" && "🎵"}
                    {asset.asset_type === "model" && "🧊"}
                    {asset.asset_type === "script" && "📜"}
                    {asset.asset_type === "spawn_point" && "📍"}
                    {asset.asset_type === "voice_zone" && "🎙️"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-text">
                      {asset.url.split("/").pop()}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${ASSET_TYPE_COLORS[asset.asset_type]}`}
                      >
                        {asset.asset_type.replace("_", " ")}
                      </span>
                      <span className="text-[10px] text-text-muted">
                        #{asset.sort_order}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* TAB: Permissions                                                  */}
        {/* ---------------------------------------------------------------- */}
        {activeTab === "Permissions" && (
          <PermissionEditor
            permissions={permissions}
            onChange={setPermissions}
          />
        )}

        {/* ---------------------------------------------------------------- */}
        {/* TAB: Settings                                                     */}
        {/* ---------------------------------------------------------------- */}
        {activeTab === "Settings" && (
          <div className="space-y-4">
            {/* Featured toggle */}
            <div className="flex items-center justify-between rounded-2xl border border-border bg-surface p-5">
              <div>
                <p className="font-semibold text-text">Featured Realm</p>
                <p className="text-xs text-text-muted">
                  Show this realm prominently in the Explore section
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsFeatured((v) => !v)}
                className={[
                  "relative h-6 w-11 rounded-full transition-colors duration-200",
                  isFeatured ? "bg-primary" : "bg-surface-light border border-border",
                ].join(" ")}
                role="switch"
                aria-checked={isFeatured}
              >
                <span
                  className={[
                    "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200",
                    isFeatured ? "translate-x-5" : "translate-x-0",
                  ].join(" ")}
                />
              </button>
            </div>

            {/* Analytics toggle */}
            <div className="flex items-center justify-between rounded-2xl border border-border bg-surface p-5">
              <div>
                <p className="font-semibold text-text">Analytics Tracking</p>
                <p className="text-xs text-text-muted">
                  Enable detailed analytics for this realm
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAnalyticsEnabled((v) => !v)}
                className={[
                  "relative h-6 w-11 rounded-full transition-colors duration-200",
                  analyticsEnabled ? "bg-primary" : "bg-surface-light border border-border",
                ].join(" ")}
                role="switch"
                aria-checked={analyticsEnabled}
              >
                <span
                  className={[
                    "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200",
                    analyticsEnabled ? "translate-x-5" : "translate-x-0",
                  ].join(" ")}
                />
              </button>
            </div>

            {/* Archive / unarchive */}
            <div className="flex items-center justify-between rounded-2xl border border-border bg-surface p-5">
              <div>
                <p className="font-semibold text-text">
                  {isArchived ? "Unarchive Realm" : "Archive Realm"}
                </p>
                <p className="text-xs text-text-muted">
                  {isArchived
                    ? "Restore this realm to active status"
                    : "Hide this realm and put it into read-only mode"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsArchived((v) => !v)}
                className={[
                  "rounded-xl px-4 py-2 text-xs font-semibold transition",
                  isArchived
                    ? "bg-success/20 text-success hover:bg-success/30"
                    : "bg-danger/20 text-danger hover:bg-danger/30",
                ].join(" ")}
              >
                {isArchived ? "Unarchive" : "Archive"}
              </button>
            </div>

            {/* Danger zone */}
            <div className="rounded-2xl border border-danger/30 bg-danger/5 p-5">
              <p className="mb-1 font-semibold text-danger">Danger Zone</p>
              <p className="mb-4 text-xs text-text-muted">
                Permanently delete this realm and all its content. This action
                cannot be undone.
              </p>
              <button
                type="button"
                className="rounded-xl bg-danger/20 px-4 py-2 text-xs font-semibold text-danger hover:bg-danger/30 transition"
              >
                Delete Realm
              </button>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* TAB: Analytics                                                    */}
        {/* ---------------------------------------------------------------- */}
        {activeTab === "Analytics" && (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "Members (30d)", value: "+142", trend: "up" },
                { label: "Messages (30d)", value: "2,841", trend: "up" },
                { label: "Activity Score", value: "87", trend: "neutral" },
                { label: "Revenue (DREAM)", value: "1,250", trend: "up" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-border bg-surface p-5"
                >
                  <p className="text-xs text-text-muted">{stat.label}</p>
                  <p className="mt-1 text-2xl font-bold text-text">
                    {stat.value}
                  </p>
                  {stat.trend === "up" && (
                    <p className="mt-1 text-xs text-success">↑ Growing</p>
                  )}
                  {stat.trend === "neutral" && (
                    <p className="mt-1 text-xs text-text-muted">→ Stable</p>
                  )}
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-border bg-surface p-6">
              <h3 className="mb-2 font-semibold text-text">
                Top Events (Last 30 Days)
              </h3>
              <p className="mb-6 text-xs text-text-muted">
                Most frequent realm events by type
              </p>
              <div className="space-y-3">
                {[
                  { type: "member_joined", count: 142, pct: 100 },
                  { type: "announcement", count: 8, pct: 6 },
                  { type: "mini_game_started", count: 5, pct: 4 },
                  { type: "zone_added", count: 3, pct: 2 },
                ].map((evt) => (
                  <div key={evt.type} className="flex items-center gap-3">
                    <p className="w-36 shrink-0 text-xs text-text-muted">
                      {evt.type.replace(/_/g, " ")}
                    </p>
                    <div className="flex-1 overflow-hidden rounded-full bg-surface-light">
                      <div
                        className="h-2 rounded-full bg-primary transition-all duration-500"
                        style={{ width: `${evt.pct}%` }}
                      />
                    </div>
                    <p className="w-8 text-right text-xs font-medium text-text">
                      {evt.count}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {!analyticsEnabled && (
              <div className="rounded-2xl border border-border bg-surface p-6 text-center">
                <p className="text-sm font-medium text-text">
                  Analytics tracking is disabled
                </p>
                <p className="mt-1 text-xs text-text-muted">
                  Enable it in Settings to start collecting detailed metrics.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
