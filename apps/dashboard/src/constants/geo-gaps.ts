import type { GeoGapsTab } from "@/types/components/geo-gaps";

export const GEO_GAPS_TABS: { value: GeoGapsTab; label: string }[] = [
  { value: "prompt", label: "Prompt Gaps" },
  { value: "search", label: "Search Gaps" },
  { value: "ai", label: "AI Search Gaps" },
];
