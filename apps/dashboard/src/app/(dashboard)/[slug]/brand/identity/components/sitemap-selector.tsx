"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@notra/ui/components/ui/select";
import { useTranslations } from "use-intl";

import type { SitemapSelectorProps } from "@/types/hooks/brand-sitemaps";

export function SitemapSelector({
  sitemaps,
  selectedSitemapId,
  onSelect,
}: SitemapSelectorProps) {
  const t = useTranslations("brand.sitemap");
  const value =
    selectedSitemapId &&
    sitemaps.some((sitemap) => sitemap.id === selectedSitemapId)
      ? selectedSitemapId
      : sitemaps.at(0)?.id;
  const items = sitemaps.map((sitemap) => ({
    label: sitemap.label,
    value: sitemap.id,
  }));

  return (
    <Select
      items={items}
      onValueChange={(nextValue) => {
        if (nextValue) {
          onSelect(nextValue);
        }
      }}
      value={value}
    >
      <SelectTrigger
        aria-label={t("selectSitemap")}
        className="w-full min-w-0 sm:w-72"
      >
        <SelectValue placeholder={t("selectSitemap")} />
      </SelectTrigger>
      <SelectContent>
        {sitemaps.map((sitemap) => (
          <SelectItem key={sitemap.id} value={sitemap.id}>
            {sitemap.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
