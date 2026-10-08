"use client";

import type {
  GeoPromptHistoryCheck,
  GeoPromptResultSummary,
} from "@notra/geo-core/types/geo";
import { useState } from "react";

import {
  useGeoPromptHistory,
  useGeoPromptResultDetail,
} from "@/lib/hooks/use-geo";
import type { PromptAnswerSelectionInput } from "@/types/geo-prompt-detail";
import { geoPromptDetailState } from "@/utils/geo-prompt-detail";
import {
  latestPromptResults,
  promptHistoryForEngine,
  promptHistoryForScanLanguage,
  withoutSupersededNoSearchResults,
} from "@/utils/geo-prompt-history";

// A scan-scoped view shows exactly what that scan answered; the latest view
// hides legacy no-search answers a search answer replaced.
function promptAnswerResults({
  row,
  visibleChecks,
  scanId,
  scanPromptId,
  initialEngine,
}: Pick<PromptAnswerSelectionInput, "row" | "scanId" | "initialEngine"> & {
  visibleChecks: readonly GeoPromptHistoryCheck[];
  scanPromptId: string;
}): GeoPromptResultSummary[] {
  if (scanId) {
    return latestPromptResults([], visibleChecks, scanPromptId, row.prompt);
  }
  return withoutSupersededNoSearchResults(
    latestPromptResults(row.results, visibleChecks, scanPromptId, row.prompt),
    initialEngine
  );
}

export function usePromptAnswerSelection({
  row,
  organizationId,
  open,
  scanId,
  initialLanguage,
  initialEngine,
}: PromptAnswerSelectionInput) {
  const [language, setLanguage] = useState(initialLanguage ?? "");
  const scanPromptId = row.results[0]?.promptId ?? row.id;
  const history = useGeoPromptHistory(organizationId, scanPromptId, {
    enabled: open,
    scanId,
  });
  const { languages, selectedLanguage, visibleChecks } =
    promptHistoryForScanLanguage(history.data?.checks ?? [], scanId, language);
  const results = promptAnswerResults({
    row,
    visibleChecks,
    scanId,
    scanPromptId,
    initialEngine,
  });
  const engines = results.map((result) => result.engine);
  const [engine, setEngine] = useState(initialEngine ?? "");
  const active =
    results.find((result) => result.engine === engine) ?? results[0] ?? null;
  // Keyed through the close: the page unmounts once the slide-out ends, and
  // dropping the key here blanks the answer while it is still on screen.
  const checkId = active?.checkId ?? null;
  const detail = useGeoPromptResultDetail(organizationId, checkId);
  const detailState = geoPromptDetailState(
    active?.checkId ?? null,
    detail.data,
    detail.isError,
    scanId ? history.status : undefined
  );
  const onRetry = () => {
    if (scanId && history.isError) {
      void history.refetch();
    } else {
      void detail.refetch();
    }
  };
  const engineHistory = active
    ? promptHistoryForEngine(visibleChecks, active.engine)
    : [];
  const promptText = scanId
    ? (detail.data?.result?.prompt ?? row.prompt)
    : row.prompt;
  return {
    history,
    scanPromptId,
    languages,
    selectedLanguage,
    setLanguage,
    results,
    engines,
    engine,
    setEngine,
    active,
    detail,
    detailState,
    onRetry,
    engineHistory,
    promptText,
  };
}
