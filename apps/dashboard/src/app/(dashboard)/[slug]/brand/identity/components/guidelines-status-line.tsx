"use client";

import { Loader2Icon } from "lucide-react";
import { useFormatter, useNow, useTranslations } from "next-intl";

import type { GuidelinesStatusLineProps } from "@/types/brand-identity";
import { latest } from "@/utils/latest-date";

export function GuidelinesStatusLine({
  generating,
  lastGeneratedAt,
}: GuidelinesStatusLineProps) {
  const t = useTranslations("brand.guidelines.panel");
  const format = useFormatter();
  const now = useNow();

  if (generating) {
    return (
      <p className="text-muted-foreground flex items-center justify-end gap-2 text-xs">
        <Loader2Icon className="size-3 animate-spin" />
        {t("updatingGuidelines")}
      </p>
    );
  }

  if (!lastGeneratedAt) {
    return null;
  }

  return (
    <p className="text-muted-foreground text-right text-xs">
      {t("updatedAt", {
        time: format.relativeTime(
          new Date(lastGeneratedAt),
          latest(now, lastGeneratedAt)
        ),
      })}
    </p>
  );
}
