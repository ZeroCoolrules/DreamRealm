/**
 * AssetUploader
 *
 * Drag-and-drop file picker simulation for realm asset management.
 * Does not upload to a backend — tracks file metadata locally and
 * notifies the parent via onAssetsChange.
 */

"use client";

import { useCallback, useRef, useState } from "react";

export interface UploadedAsset {
  id: string;
  name: string;
  type: string;
  size?: number;
}

interface AssetUploaderProps {
  onAssetsChange: (assets: UploadedAsset[]) => void;
  maxFiles?: number;
  acceptedTypes?: string;
}

const ASSET_TYPE_ICONS: Record<string, string> = {
  "image/": "🖼️",
  "video/": "🎬",
  "audio/": "🎵",
  "model/": "🧊",
  "text/javascript": "📜",
  "application/json": "📄",
  "application/octet-stream": "📦",
};

function getAssetIcon(mimeType: string): string {
  for (const [prefix, icon] of Object.entries(ASSET_TYPE_ICONS)) {
    if (mimeType.startsWith(prefix)) return icon;
  }
  return "📎";
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function generateId(): string {
  return `asset-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function AssetUploader({
  onAssetsChange,
  maxFiles = 10,
  acceptedTypes = "image/*,video/*,audio/*,.glb,.gltf,.js,.json",
}: AssetUploaderProps) {
  const [assets, setAssets] = useState<UploadedAsset[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return;
      const remaining = maxFiles - assets.length;
      if (remaining <= 0) return;

      const newAssets: UploadedAsset[] = Array.from(files)
        .slice(0, remaining)
        .map((file) => ({
          id: generateId(),
          name: file.name,
          type: file.type || "application/octet-stream",
          size: file.size,
        }));

      const updated = [...assets, ...newAssets];
      setAssets(updated);
      onAssetsChange(updated);
    },
    [assets, maxFiles, onAssetsChange]
  );

  const removeAsset = (id: string) => {
    const updated = assets.filter((a) => a.id !== id);
    setAssets(updated);
    onAssetsChange(updated);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(e.target.files);
    // Reset input value so re-selecting same file works
    e.target.value = "";
  };

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
        className={[
          "flex min-h-36 cursor-pointer flex-col items-center justify-center gap-3",
          "rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-200",
          isDragging
            ? "border-primary bg-primary/10 scale-[1.01]"
            : "border-border bg-surface hover:border-primary/50 hover:bg-surface-light",
        ].join(" ")}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-2xl">
          ☁️
        </div>
        <div>
          <p className="text-sm font-semibold text-text">
            Drag & drop files here
          </p>
          <p className="mt-0.5 text-xs text-text-muted">
            or click to browse — images, video, audio, 3D models, scripts
          </p>
        </div>
        {assets.length > 0 && (
          <p className="text-xs text-primary">
            {assets.length} / {maxFiles} files selected
          </p>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={acceptedTypes}
        className="hidden"
        onChange={handleInputChange}
      />

      {/* Asset list */}
      {assets.length > 0 && (
        <ul className="space-y-2">
          {assets.map((asset) => (
            <li
              key={asset.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 transition hover:bg-surface-light"
            >
              <span className="text-xl" aria-hidden>
                {getAssetIcon(asset.type)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-text">
                  {asset.name}
                </p>
                <p className="text-xs text-text-muted">
                  {asset.type.split("/")[1]?.toUpperCase() ?? "FILE"}
                  {asset.size !== undefined && ` · ${formatBytes(asset.size)}`}
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeAsset(asset.id);
                }}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-text-muted hover:bg-danger/20 hover:text-danger transition"
                aria-label={`Remove ${asset.name}`}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
