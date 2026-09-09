"use client";

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
} from "@/utils/geo-prompt-history";

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
  const results = latestPromptResults(
    scanId && history.data ? [] : row.results,
    visibleChecks,
    scanPromptId,
    row.prompt
  );
  const engines = results.map((result) => result.engine);
  const [engine, setEngine] = useState(
    () =>
      engines.find((candidate) => candidate === initialEngine) ??
      engines[0] ??
      ""
  );
  const active =
    results.find((result) => result.engine === engine) ?? results[0] ?? null;
  const checkId = open ? (active?.checkId ?? null) : null;
  const detail = useGeoPromptResultDetail(organizationId, checkId);
  const detailState = geoPromptDetailState(
    active?.checkId ?? null,
    detail.data,
    detail.isError
  );
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
    engineHistory,
    promptText,
  };
}
