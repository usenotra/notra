"use client";

import { geoAnswerMentionTerms } from "@notra/geo-core/utils/geo-answer-mentions";

import { useGeoSettings } from "@/lib/hooks/use-geo";
import { useGeoCompetitorsDb } from "@/lib/hooks/use-geo-db";
import type { GeoAnswerMentionContextValue } from "@/types/geo-answer-mentions";

const EMPTY_MENTIONED: readonly string[] = [];
const EMPTY_TRACKED: GeoAnswerMentionContextValue["competitors"] = [];

export function useGeoAnswerMentionData(
  organizationId: string | undefined,
  mentionedCompetitors: readonly string[] = EMPTY_MENTIONED
) {
  const enabledId = organizationId ?? "";
  const { data: settingsData } = useGeoSettings(enabledId);
  const { competitors } = useGeoCompetitorsDb(enabledId, {
    enabled: Boolean(organizationId),
  });
  const settings = settingsData?.settings;
  const terms = geoAnswerMentionTerms({
    companyName: settings?.companyName,
    aliases: settings?.aliases,
    mentionedCompetitors,
    trackedCompetitors: competitors,
  });

  return { terms, competitors };
}
