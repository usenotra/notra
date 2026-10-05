"use client";

import { Spinner } from "@notra/ui/components/ui/spinner";
import { useFormatter, useNow, useTranslations } from "use-intl";

import type { GuidelinesStatusLineProps } from "@/types/brand-identity";
import { latest } from "@/utils/latest-date";

export function GuidelinesStatusLine({
  generating,
  lastGeneratedAt,
}: GuidelinesStatusLineProps) {
  const t = useTranslations("brand.guidelines.panel");
  const format = useFormatter();
  const now = useNow({ updateInterval: 60_000 });

  if (generating) {
    return (
      <p className="text-muted-foreground flex items-center justify-end gap-2 text-xs">
        <Spinner className="size-3" />
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
