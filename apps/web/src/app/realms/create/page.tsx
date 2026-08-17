/**
 * Realm Creation Wizard
 *
 * 4-step guided flow to create a new realm:
 *  Step 1 — Basic info (name, slug, description, category)
 *  Step 2 — Visibility (public / private / invite-only / monetized)
 *  Step 3 — Asset upload
 *  Step 4 — Review & Create
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import AppShell from "../../components/AppShell";
import AssetUploader, { type UploadedAsset } from "../../components/AssetUploader";
import { SAMPLE_REALMS } from "../../lib/realms";
import type { RealmVisibility } from "@dreamrealm/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TOTAL_STEPS = 4;

const CATEGORIES = [
  "Dating",
  "Social",
  "Creative",
  "Business",
  "Intellectual",
  "Gaming",
  "Wellness",
  "Music",
  "Arts",
  "Sports",
];

const VISIBILITY_OPTIONS: {
  id: RealmVisibility;
  label: string;
  icon: string;
  desc: string;
}[] = [
  {
    id: "public",
    label: "Public",
    icon: "🌍",
    desc: "Anyone can discover and join this realm freely",
  },
  {
    id: "private",
    label: "Private",
    icon: "🔒",
    desc: "Hidden from search — members join by invite only",
  },
  {
    id: "invite_only",
    label: "Invite Only",
    icon: "📨",
    desc: "Visible in search but requires an invite to enter",
  },
  {
    id: "monetized",
    label: "Monetized",
    icon: "💎",
    desc: "Premium access powered by DreamCoin — earn from your realm",
  },
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FormData {
  name: string;
  slug: string;
  description: string;
  category: string;
  visibility: RealmVisibility;
}

type FormErrors = Partial<Record<keyof FormData, string>>;

// ---------------------------------------------------------------------------
// Helper: auto-generate slug from name
// ---------------------------------------------------------------------------

function nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 60);
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StepIndicator({
  current,
  total,
}: {
  current: number;
  total: number;
}) {
  return (
    <div className="mb-8 flex items-center justify-center gap-2">
      {Array.from({ length: total }, (_, i) => {
        const step = i + 1;
        const isComplete = step < current;
        const isActive = step === current;
        return (
          <div key={step} className="flex items-center gap-2">
            <div
              className={[
                "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all duration-300",
                isComplete
                  ? "bg-success text-white"
                  : isActive
                  ? "bg-primary text-white shadow-glow"
                  : "bg-surface-light text-text-muted",
              ].join(" ")}
            >
              {isComplete ? "✓" : step}
            </div>
            {step < total && (
              <div
                className={[
                  "h-0.5 w-8 transition-all duration-300",
                  isComplete ? "bg-success" : "bg-border",
                ].join(" ")}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function CreateRealmPage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>({
    name: "",
    slug: "",
    description: "",
    category: "",
    visibility: "public",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [assets, setAssets] = useState<UploadedAsset[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [created, setCreated] = useState(false);

  // ------------------------------------------------------------------
  // Field helpers
  // ------------------------------------------------------------------

  const update = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      // Auto-generate slug from name when user hasn't customised it
      if (key === "name" && prev.slug === nameToSlug(prev.name)) {
        next.slug = nameToSlug(value as string);
      }
      return next;
    });
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  // ------------------------------------------------------------------
  // Validation per step
  // ------------------------------------------------------------------

  const validateStep1 = (): boolean => {
    const errs: FormErrors = {};
    if (!form.name.trim()) errs.name = "Realm name is required";
    else if (form.name.length < 3) errs.name = "Name must be at least 3 characters";

    if (!form.slug.trim()) errs.slug = "Slug is required";
    else if (!/^[a-z0-9-]+$/.test(form.slug))
      errs.slug = "Slug can only contain lowercase letters, numbers, and hyphens";
    else if (SAMPLE_REALMS.some((r) => r.slug === form.slug))
      errs.slug = "This slug is already taken";

    if (!form.category) errs.category = "Please select a category";

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const goNext = () => {
    if (step === 1 && !validateStep1()) return;
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  };

  const goBack = () => setStep((s) => Math.max(s - 1, 1));

  const handleCreate = async () => {
    setIsCreating(true);
    // Simulate async creation
    await new Promise((r) => setTimeout(r, 1200));
    setIsCreating(false);
    setCreated(true);
  };

  // ------------------------------------------------------------------
  // Success state
  // ------------------------------------------------------------------

  if (created) {
    return (
      <AppShell>
        <div className="flex min-h-[80vh] items-center justify-center px-4">
          <div className="w-full max-w-md rounded-3xl border border-border bg-surface p-10 text-center shadow-glow">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-success/20 text-4xl">
              ✨
            </div>
            <h2 className="mb-2 text-2xl font-bold text-text">
              Realm Created!
            </h2>
            <p className="mb-6 text-sm text-text-muted">
              <span className="font-semibold text-primary">{form.name}</span>{" "}
              is now live. Start inviting members and building your world.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link
                href={`/realms/${form.slug}`}
                className="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-glow hover:bg-primary/90 transition"
              >
                View Realm
              </Link>
              <Link
                href="/realms"
                className="rounded-xl border border-border px-6 py-2.5 text-sm text-text hover:bg-surface-light transition"
              >
                Explore Realms
              </Link>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  // ------------------------------------------------------------------
  // Step content
  // ------------------------------------------------------------------

  const stepTitles = [
    "Basic Info",
    "Visibility",
    "Upload Assets",
    "Review & Create",
  ];

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl px-4 py-10">
        {/* Breadcrumb */}
        <div className="mb-6 flex items-center gap-2 text-sm text-text-muted">
          <Link href="/realms" className="hover:text-primary transition">
            Realms
          </Link>
          <span>/</span>
          <span className="text-text">Create</span>
        </div>

        <h1 className="mb-1 text-2xl font-bold text-glow">Create a Realm</h1>
        <p className="mb-8 text-sm text-text-muted">
          Build your own world in DreamRealm — set the rules, invite your crew,
          and define the vibe.
        </p>

        <StepIndicator current={step} total={TOTAL_STEPS} />

        {/* Card */}
        <div className="rounded-2xl border border-border bg-surface shadow-glow">
          {/* Step header */}
          <div className="border-b border-border px-6 py-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">
              Step {step} of {TOTAL_STEPS}
            </p>
            <h2 className="text-lg font-bold text-text">{stepTitles[step - 1]}</h2>
          </div>

          <div className="px-6 py-6">
            {/* -------------------------------------------------------- */}
            {/* STEP 1 — Basic Info                                       */}
            {/* -------------------------------------------------------- */}
            {step === 1 && (
              <div className="space-y-5">
                {/* Name */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-text">
                    Realm Name <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => update("name", e.target.value)}
                    placeholder="e.g. The Neon Nexus"
                    maxLength={200}
                    className="w-full rounded-xl border border-border bg-surface-light px-4 py-2.5 text-sm text-text placeholder:text-text-muted outline-none focus:border-primary transition"
                  />
                  {errors.name && (
                    <p className="mt-1 text-xs text-danger">{errors.name}</p>
                  )}
                </div>

                {/* Slug */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-text">
                    URL Slug <span className="text-danger">*</span>
                  </label>
                  <div className="flex items-center overflow-hidden rounded-xl border border-border bg-surface-light focus-within:border-primary transition">
                    <span className="select-none border-r border-border px-3 py-2.5 text-xs text-text-muted">
                      /realms/
                    </span>
                    <input
                      type="text"
                      value={form.slug}
                      onChange={(e) =>
                        update("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
                      }
                      placeholder="neon-nexus"
                      maxLength={60}
                      className="flex-1 bg-transparent px-3 py-2.5 text-sm text-text outline-none"
                    />
                  </div>
                  {errors.slug && (
                    <p className="mt-1 text-xs text-danger">{errors.slug}</p>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-text">
                    Description
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) => update("description", e.target.value)}
                    placeholder="Describe what your realm is about..."
                    rows={4}
                    maxLength={2000}
                    className="w-full resize-none rounded-xl border border-border bg-surface-light px-4 py-2.5 text-sm text-text placeholder:text-text-muted outline-none focus:border-primary transition"
                  />
                  <p className="mt-1 text-right text-xs text-text-muted">
                    {form.description.length} / 2000
                  </p>
                </div>

                {/* Category */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-text">
                    Category <span className="text-danger">*</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => update("category", cat)}
                        className={[
                          "rounded-full px-3 py-1 text-xs font-medium transition",
                          form.category === cat
                            ? "bg-primary text-white shadow-glow"
                            : "border border-border bg-surface-light text-text-muted hover:border-primary hover:text-primary",
                        ].join(" ")}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                  {errors.category && (
                    <p className="mt-1 text-xs text-danger">{errors.category}</p>
                  )}
                </div>
              </div>
            )}

            {/* -------------------------------------------------------- */}
            {/* STEP 2 — Visibility                                       */}
            {/* -------------------------------------------------------- */}
            {step === 2 && (
              <div className="space-y-3">
                <p className="text-sm text-text-muted">
                  Control who can discover and access your realm.
                </p>
                {VISIBILITY_OPTIONS.map((opt) => {
                  const isSelected = form.visibility === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => update("visibility", opt.id)}
                      className={[
                        "flex w-full items-start gap-4 rounded-2xl border p-4 text-left transition-all duration-200",
                        isSelected
                          ? "border-primary bg-primary/10 shadow-glow"
                          : "border-border bg-surface-light hover:border-primary/50 hover:bg-surface",
                      ].join(" ")}
                    >
                      <span className="mt-0.5 text-2xl">{opt.icon}</span>
                      <div className="flex-1">
                        <p
                          className={[
                            "font-semibold text-sm",
                            isSelected ? "text-primary" : "text-text",
                          ].join(" ")}
                        >
                          {opt.label}
                        </p>
                        <p className="text-xs text-text-muted">{opt.desc}</p>
                      </div>
                      <div
                        className={[
                          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition",
                          isSelected
                            ? "border-primary bg-primary"
                            : "border-border",
                        ].join(" ")}
                      >
                        {isSelected && (
                          <div className="h-2 w-2 rounded-full bg-white" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* -------------------------------------------------------- */}
            {/* STEP 3 — Asset Upload                                     */}
            {/* -------------------------------------------------------- */}
            {step === 3 && (
              <div className="space-y-3">
                <p className="text-sm text-text-muted">
                  Upload images, videos, 3D models, or scripts to bring your
                  realm to life. You can add more later.
                </p>
                <AssetUploader onAssetsChange={setAssets} />
                {assets.length > 0 && (
                  <p className="text-xs text-success">
                    ✓ {assets.length} asset{assets.length > 1 ? "s" : ""} ready
                    to publish
                  </p>
                )}
              </div>
            )}

            {/* -------------------------------------------------------- */}
            {/* STEP 4 — Review & Create                                  */}
            {/* -------------------------------------------------------- */}
            {step === 4 && (
              <div className="space-y-4">
                <p className="text-sm text-text-muted">
                  Review your realm configuration before publishing.
                </p>

                <div className="overflow-hidden rounded-xl border border-border">
                  {[
                    { label: "Name", value: form.name },
                    { label: "Slug", value: `/realms/${form.slug}` },
                    { label: "Category", value: form.category },
                    {
                      label: "Visibility",
                      value:
                        VISIBILITY_OPTIONS.find((o) => o.id === form.visibility)
                          ?.label ?? form.visibility,
                    },
                    {
                      label: "Assets",
                      value:
                        assets.length > 0
                          ? `${assets.length} file${assets.length > 1 ? "s" : ""}`
                          : "None",
                    },
                  ].map((row, i) => (
                    <div
                      key={row.label}
                      className={[
                        "flex items-start gap-4 px-4 py-3",
                        i % 2 === 0 ? "bg-surface" : "bg-surface-light",
                      ].join(" ")}
                    >
                      <p className="w-24 shrink-0 text-xs font-medium text-text-muted">
                        {row.label}
                      </p>
                      <p className="text-sm text-text">{row.value || "—"}</p>
                    </div>
                  ))}
                </div>

                {form.description && (
                  <div className="rounded-xl border border-border bg-surface p-4">
                    <p className="mb-1 text-xs font-medium text-text-muted">
                      Description
                    </p>
                    <p className="text-sm leading-relaxed text-text">
                      {form.description}
                    </p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={isCreating}
                  className="w-full rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white shadow-glow hover:bg-primary/90 disabled:opacity-60 transition"
                >
                  {isCreating ? "Creating Realm…" : "✨ Create Realm"}
                </button>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex justify-between border-t border-border px-6 py-4">
            <button
              type="button"
              onClick={goBack}
              disabled={step === 1}
              className="rounded-xl border border-border px-5 py-2 text-sm text-text hover:bg-surface-light disabled:cursor-not-allowed disabled:opacity-40 transition"
            >
              Back
            </button>
            {step < TOTAL_STEPS && (
              <button
                type="button"
                onClick={goNext}
                className="rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-white shadow-glow hover:bg-primary/90 transition"
              >
                Next →
              </button>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
