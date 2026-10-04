"use client";

import { SearchIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Input } from "@notra/ui/components/ui/input";
import { useTranslations } from "next-intl";

import type {
  CompetitorChoicesFooterProps,
  CompetitorChoicesSearchProps,
} from "@/types/components/geo";

export function CompetitorChoicesSearch({
  value,
  onChange,
}: CompetitorChoicesSearchProps) {
  const t = useTranslations("geo.competitorChoices");
  return (
    <div className="relative">
      <HugeiconsIcon
        className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2"
        icon={SearchIcon}
        size={14}
      />
      <Input
        aria-label={t("searchLabel")}
        className="h-8 pl-8"
        onChange={(event) => onChange(event.target.value)}
        placeholder={t("searchPlaceholder")}
        type="search"
        value={value}
      />
    </div>
  );
}

export function CompetitorChoicesFooter({
  query,
  hidden,
  visibleCount,
}: CompetitorChoicesFooterProps) {
  const t = useTranslations("geo.competitorChoices");
  if (visibleCount === 0 && query.trim().length > 0) {
    return (
      <p className="text-muted-foreground text-xs">
        {t("noMatches", { query: query.trim() })}
      </p>
    );
  }
  if (hidden === 0) {
    return null;
  }
  return (
    <p className="text-muted-foreground text-xs">
      {t("moreHidden", { count: hidden })}
    </p>
  );
}
