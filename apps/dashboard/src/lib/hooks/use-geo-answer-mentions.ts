"use client";

import { geoAnswerMentionTerms } from "@notra/geo-core/utils/geo-answer-mentions";
import { useMemo } from "react";

import { useGeoCompetitors, useGeoSettings } from "@/lib/hooks/use-geo";
import type { GeoAnswerMentionContextValue } from "@/types/geo-answer-mentions";

const EMPTY_MENTIONED: readonly string[] = [];
const EMPTY_TRACKED: GeoAnswerMentionContextValue["competitors"] = [];

export function useGeoAnswerMentionData(
  organizationId: string | undefined,
  mentionedCompetitors: readonly string[] = EMPTY_MENTIONED
) {
  const enabledId = organizationId ?? "";
  const { data: settingsData } = useGeoSettings(enabledId);
  const { data: competitorsData } = useGeoCompetitors(enabledId);
  const settings = settingsData?.settings;
  const competitors = competitorsData?.competitors ?? EMPTY_TRACKED;

  const terms = useMemo(
    () =>
      geoAnswerMentionTerms({
        companyName: settings?.companyName,
        aliases: settings?.aliases,
        mentionedCompetitors,
        trackedCompetitors: competitors,
      }),
    [
      competitors,
      mentionedCompetitors,
      settings?.aliases,
      settings?.companyName,
    ]
  );

  return { terms, competitors };
}
