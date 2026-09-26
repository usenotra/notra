"use client";

import { CompetitorLogo } from "@/components/geo/competitor-logo";
import type { WriteBrandOptionProps } from "@/types/components/geo-writer";
import { getWebsiteDomain } from "@/utils/brand";

export function WriteBrandOption({
  name,
  websiteUrl,
  isDefault,
}: WriteBrandOptionProps) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <CompetitorLogo
        className="size-5"
        domain={getWebsiteDomain(websiteUrl)}
        name={name}
      />
      <span className="truncate">
        {name}
        {isDefault ? " (project default)" : ""}
      </span>
    </span>
  );
}
