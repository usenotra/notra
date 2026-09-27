"use client";

import {
  Add01Icon,
  Copy01Icon,
  Edit02Icon,
  PaintBoardIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";

import { Button } from "@/components/button";
import {
  COLOR_ROLE_LABELS,
  EXPECTED_COLOR_ROLES,
} from "@/constants/brand-guideline-ui";
import type { GuidelinesColorsSectionProps } from "@/types/brand-identity";
import type {
  BrandGuidelineColor,
  BrandGuidelineColorRole,
} from "@/types/hooks/brand-guidelines";
import { joinMeta } from "@/utils/brand-guideline-display";
import { copyToClipboard } from "@/utils/copy-to-clipboard";

import { GuidelinesColorEditDialog } from "./guidelines-color-edit-dialog";

export function GuidelinesColorsSection({
  colors,
  organizationId,
  voiceId,
}: GuidelinesColorsSectionProps) {
  const [editing, setEditing] = useState<BrandGuidelineColor | null>(null);
  const [creatingRole, setCreatingRole] =
    useState<BrandGuidelineColorRole | null>(null);

  if (colors.length === 0) {
    return null;
  }

  const missingRoles = EXPECTED_COLOR_ROLES.filter(
    (role) => !colors.some((color) => color.role === role)
  );

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <HugeiconsIcon
          className="text-muted-foreground size-4"
          icon={PaintBoardIcon}
        />
        <h2 className="text-sm font-semibold">Colors</h2>
        <span className="text-muted-foreground text-xs tabular-nums">
          {colors.length}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {colors.map((color) => {
          const meta = joinMeta([
            color.role !== "custom" ? COLOR_ROLE_LABELS[color.role] : null,
            color.usage,
          ]);
          const displayValue = color.darkValue
            ? `${color.lightValue} / ${color.darkValue}`
            : color.lightValue;

          return (
            <div
              className="flex items-center gap-3 rounded-xl border p-3"
              key={color.id}
            >
              <span
                aria-hidden="true"
                className="size-9 shrink-0 rounded-lg border"
                style={{ backgroundColor: color.lightValue }}
              />
              {color.darkValue ? (
                <span
                  aria-hidden="true"
                  className="mt-5 -ml-5 size-5 shrink-0 rounded-md border"
                  style={{ backgroundColor: color.darkValue }}
                />
              ) : null}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {color.name ?? color.lightValue}
                </p>
                <p className="text-muted-foreground truncate font-mono text-xs uppercase tabular-nums">
                  {displayValue}
                </p>
                {meta ? (
                  <p className="text-muted-foreground truncate text-xs">
                    {meta}
                  </p>
                ) : null}
              </div>

              <div className="flex shrink-0 items-center gap-0.5">
                <Button
                  aria-label={`Edit ${color.name ?? color.lightValue}`}
                  onClick={() => setEditing(color)}
                  size="icon-sm"
                  variant="ghost"
                >
                  <HugeiconsIcon className="size-3.5" icon={Edit02Icon} />
                </Button>
                <Button
                  aria-label={`Copy ${color.lightValue}`}
                  onClick={() => copyToClipboard(color.lightValue)}
                  size="icon-sm"
                  variant="ghost"
                >
                  <HugeiconsIcon className="size-3.5" icon={Copy01Icon} />
                </Button>
              </div>
            </div>
          );
        })}

        {missingRoles.map((role) => (
          <button
            className="hover:border-border hover:bg-muted/40 flex items-center gap-3 rounded-xl border border-dashed p-3 text-left transition-colors"
            key={`placeholder-${role}`}
            onClick={() => setCreatingRole(role)}
            type="button"
          >
            <span
              aria-hidden="true"
              className="bg-muted/30 text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-lg border border-dashed"
            >
              <HugeiconsIcon className="size-4" icon={Add01Icon} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-muted-foreground truncate text-sm font-medium">
                {COLOR_ROLE_LABELS[role]}
              </p>
              <p className="text-muted-foreground/70 truncate text-xs">
                Add color
              </p>
            </div>
          </button>
        ))}
      </div>

      {editing || creatingRole ? (
        <GuidelinesColorEditDialog
          color={editing}
          key={editing?.id ?? creatingRole ?? "color-dialog"}
          onOpenChange={(open) => {
            if (!open) {
              setEditing(null);
              setCreatingRole(null);
            }
          }}
          open
          organizationId={organizationId}
          presetRole={creatingRole ?? undefined}
          voiceId={voiceId}
        />
      ) : null}
    </section>
  );
}
