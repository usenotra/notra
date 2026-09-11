"use client";

import { geoAnswerMentionTerms } from "@notra/geo-core/utils/geo-answer-mentions";
import { useMemo } from "react";

import { useGeoCompetitors, useGeoSettings } from "@/lib/hooks/use-geo";

const EMPTY_COMPETITORS: readonly string[] = [];

export function useGeoAnswerMentionTerms(
  organizationId: string | undefined,
  mentionedCompetitors: readonly string[] = EMPTY_COMPETITORS
) {
  const enabledId = organizationId ?? "";
  const { data: settingsData } = useGeoSettings(enabledId);
  const { data: competitorsData } = useGeoCompetitors(enabledId);
  const settings = settingsData?.settings;

  return useMemo(
    () =>
      geoAnswerMentionTerms({
        companyName: settings?.companyName,
        aliases: settings?.aliases,
        mentionedCompetitors,
        trackedCompetitors: competitorsData?.competitors,
      }),
    [
      competitorsData?.competitors,
      mentionedCompetitors,
      settings?.aliases,
      settings?.companyName,
    ]
  );
}
