"use client";

import { useLocale, useTranslations } from "use-intl";

import { cn } from "@/lib/utils";
import type { SiteRelativeTimeProps } from "@/types/components/sites";
import { formatRelative } from "@/utils/format-relative";

export function SiteRelativeTime({
  date,
  className,
  inline = false,
}: SiteRelativeTimeProps) {
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
