"use client";

import { Add01Icon, Image01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { ImageZoom } from "@notra/ui/components/kibo-ui/image-zoom";
import Image from "next/image";
import { useState } from "react";

import {
  ASSET_KIND_LABELS,
  ASSET_SLOTS,
  ASSET_VARIANT_LABELS,
} from "@/constants/brand-guideline-ui";
import type { GuidelinesAssetsSectionProps } from "@/types/brand-identity";
import type {
  BrandGuidelineAsset,
  BrandGuidelineAssetKind,
  BrandGuidelineAssetVariant,
} from "@/types/hooks/brand-guidelines";
import { getBrandGuidelineAssetName } from "@/utils/brand-guideline-assets";
import { formatDimensions, joinMeta } from "@/utils/brand-guideline-display";

import { GuidelinesAssetEditDialog } from "./guidelines-asset-edit-dialog";
import { GuidelinesResourceActions } from "./guidelines-resource-actions";

export function GuidelinesAssetsSection({
  assets,
  organizationId,
  voiceId,
}: GuidelinesAssetsSectionProps) {
  const [editing, setEditing] = useState<BrandGuidelineAsset | null>(null);
  const [creatingSlot, setCreatingSlot] = useState<{
    kind: BrandGuidelineAssetKind;
    variant: BrandGuidelineAssetVariant;
  } | null>(null);

  const missingSlots = ASSET_SLOTS.filter(
    (slot) =>
      !assets.some(
        (asset) => asset.kind === slot.kind && asset.variant === slot.variant
      )
  );

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <HugeiconsIcon
          className="text-muted-foreground size-4"
          icon={Image01Icon}
        />
        <h2 className="text-sm font-semibold">Logo Assets</h2>
        <span className="text-muted-foreground text-xs tabular-nums">
          {assets.length}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {assets.map((asset) => {
          const displayName = getBrandGuidelineAssetName({
            format: asset.format,
            kind: asset.kind,
            variant: asset.variant,
          });
          const meta = joinMeta([
            ASSET_KIND_LABELS[asset.kind],
            asset.format?.toUpperCase(),
            ASSET_VARIANT_LABELS[asset.variant],
            formatDimensions(asset.width, asset.height),
          ]);

          return (
            <div
              className="flex flex-col overflow-hidden rounded-xl border"
              key={asset.id}
            >
              <div className="bg-muted/40 flex h-40 items-center justify-center p-4">
                <ImageZoom className="inline-block max-w-full" zoomMargin={24}>
                  <Image
                    alt={displayName}
                    className="block h-auto max-h-32 w-auto max-w-full object-contain"
                    height={asset.height ?? 256}
                    src={asset.url}
                    width={asset.width ?? 256}
                  />
                </ImageZoom>
              </div>

              <div className="flex items-center justify-between gap-2 border-t p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{displayName}</p>
                  {meta ? (
                    <p className="text-muted-foreground truncate text-xs">
                      {meta}
                    </p>
                  ) : null}
                </div>

                <GuidelinesResourceActions
                  label={displayName}
                  onEdit={() => setEditing(asset)}
                  url={asset.url}
                />
              </div>
            </div>
          );
        })}

        {missingSlots.map((slot) => (
          <button
            className="hover:border-border hover:bg-muted/40 flex flex-col overflow-hidden rounded-xl border border-dashed text-left transition-colors"
            key={`${slot.kind}-${slot.variant}`}
            onClick={() =>
              setCreatingSlot({ kind: slot.kind, variant: slot.variant })
            }
            type="button"
          >
            <div className="bg-muted/20 flex h-40 items-center justify-center">
              <HugeiconsIcon
                className="text-muted-foreground/40 size-6"
                icon={Add01Icon}
              />
            </div>
            <div className="w-full border-t border-dashed p-3">
              <p className="text-muted-foreground truncate text-sm font-medium">
                {ASSET_VARIANT_LABELS[slot.variant]}{" "}
                {ASSET_KIND_LABELS[slot.kind]}
              </p>
              <p className="text-muted-foreground/70 truncate text-xs">
                Add asset
              </p>
            </div>
          </button>
        ))}
      </div>

      {editing || creatingSlot ? (
        <GuidelinesAssetEditDialog
          asset={editing}
          key={editing?.id ?? `${creatingSlot?.kind}-${creatingSlot?.variant}`}
          onOpenChange={(open) => {
            if (!open) {
              setEditing(null);
              setCreatingSlot(null);
            }
          }}
          open
          organizationId={organizationId}
          presetKind={creatingSlot?.kind}
          presetVariant={creatingSlot?.variant}
          voiceId={voiceId}
        />
      ) : null}
    </section>
  );
}
