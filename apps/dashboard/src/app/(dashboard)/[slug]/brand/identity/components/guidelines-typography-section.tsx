"use client";

import { Edit02Icon, TextFontIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { Button } from "@/components/button";
import type { GuidelinesTypographySectionProps } from "@/types/brand-identity";
import type { BrandGuidelineFont } from "@/types/hooks/brand-guidelines";
import {
  cssFontFamily,
  googleFontHref,
  joinMeta,
} from "@/utils/brand-guideline-display";

import { GuidelinesFontEditDialog } from "./guidelines-font-edit-dialog";

export function GuidelinesTypographySection({
  fonts,
  organizationId,
  voiceId,
}: GuidelinesTypographySectionProps) {
  const t = useTranslations("brand.guidelines");
  const tCommon = useTranslations("common");
  const [editing, setEditing] = useState<BrandGuidelineFont | null>(null);

  useEffect(() => {
    const families = [
      ...new Set(fonts.flatMap((font) => (font.family ? [font.family] : []))),
    ];

    if (families.length === 0) {
      return;
    }

    const links = families.map((family) => {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = googleFontHref(family);
      document.head.appendChild(link);
      return link;
    });

    return () => {
      for (const link of links) {
        link.remove();
      }
    };
  }, [fonts]);

  if (fonts.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <HugeiconsIcon
          className="text-muted-foreground size-4"
          icon={TextFontIcon}
        />
        <h2 className="text-sm font-semibold">{t("typography.title")}</h2>
        <span className="text-muted-foreground text-xs tabular-nums">
          {fonts.length}
        </span>
      </div>

      <div className="space-y-2">
        {fonts.map((font) => {
          const meta = joinMeta([
            font.role !== "unknown" ? t(`fontRoles.${font.role}`) : null,
            font.weight ? t("typography.weight", { value: font.weight }) : null,
            font.size ? t("typography.size", { value: font.size }) : null,
            font.lineHeight
              ? t("typography.lineHeight", { value: font.lineHeight })
              : null,
          ]);

          return (
            <div
              className="flex items-start justify-between gap-3 rounded-xl border p-4"
              key={font.id}
            >
              <div className="min-w-0">
                <p
                  className="truncate text-3xl leading-tight"
                  style={{
                    fontFamily: cssFontFamily(font.family),
                    fontWeight: font.weight ?? undefined,
                  }}
                >
                  {font.family}
                </p>
                {meta ? (
                  <p className="text-muted-foreground mt-2 truncate text-xs">
                    {meta}
                  </p>
                ) : null}
              </div>

              <Button
                aria-label={tCommon("labels.editName", { name: font.family })}
                className="shrink-0"
                onClick={() => setEditing(font)}
                size="icon-sm"
                variant="ghost"
              >
                <HugeiconsIcon className="size-3.5" icon={Edit02Icon} />
              </Button>
            </div>
          );
        })}
      </div>

      {editing ? (
        <GuidelinesFontEditDialog
          font={editing}
          key={editing.id}
          onOpenChange={(open) => {
            if (!open) {
              setEditing(null);
            }
          }}
          open
          organizationId={organizationId}
          voiceId={voiceId}
        />
      ) : null}
    </section>
  );
}
