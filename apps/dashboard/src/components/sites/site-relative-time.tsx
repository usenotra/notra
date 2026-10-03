"use client";

import { useLocale, useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import { formatRelative } from "@/utils/format-relative";

export function SiteRelativeTime({
  date,
  className,
  inline = false,
}: {
  date: Date | string;
  className?: string;
  /** Mid-sentence use: "Live since just now", not "Just now". */
  inline?: boolean;
}) {
  const locale = useLocale();
  const tCommon = useTranslations("common");
  const value = new Date(date);
  const iso = value.toISOString();
  return (
    <time
      className={cn("tabular-nums", className)}
      dateTime={iso}
      title={value.toLocaleString(locale)}
    >
      {formatRelative(
        iso,
        locale,
        inline
          ? tCommon("labels.justNow").toLocaleLowerCase(locale)
          : tCommon("labels.justNow")
      )}
    </time>
  );
}
