"use client";

import { useState } from "react";

import type { WriterBrandSelectionInput } from "@/types/components/geo-writer";

import { useBrandSettings } from "./use-brand-analysis";
import { useSitemaps } from "./use-brand-sitemaps";

export function useWriterBrandSelection({
  organizationId,
  projectBrandId,
  initialBrandId,
  enabled,
}: WriterBrandSelectionInput) {
  const [selectedBrandId, setBrandVoiceId] = useState<string | null>(
    initialBrandId ?? null
  );
  const [sitemapId, setSitemapId] = useState<string | null>(null);
  const brandVoiceId = selectedBrandId ?? projectBrandId ?? null;
  const { data } = useBrandSettings(organizationId, { enabled });
  const sitemapQuery = useSitemaps(organizationId, brandVoiceId ?? "", {
    enabled,
  });
  const voices = data?.voices ?? [];
  const sitemaps = sitemapQuery.data?.sitemaps ?? [];
  const effectiveSitemapId = sitemaps.some(
    (sitemap) => sitemap.id === sitemapId
  )
    ? sitemapId
    : (sitemaps[0]?.id ?? null);

  return {
    brandVoiceId,
    setBrandVoiceId,
    voices,
    selectedVoice: voices.find((voice) => voice.id === brandVoiceId),
    sitemaps,
    isSitemapPending: Boolean(brandVoiceId) && sitemapQuery.isPending,
    effectiveSitemapId,
    setSitemapId,
  };
}
