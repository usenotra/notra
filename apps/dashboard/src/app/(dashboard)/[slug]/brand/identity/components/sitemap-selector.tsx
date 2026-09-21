"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@notra/ui/components/ui/select";

import type { SitemapSelectorProps } from "@/types/hooks/brand-sitemaps";

export function SitemapSelector({
  sitemaps,
  selectedSitemapId,
  onSelect,
}: SitemapSelectorProps) {
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
      <SelectTrigger aria-label="Select sitemap" className="w-full sm:w-72">
        <SelectValue placeholder="Select sitemap" />
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
