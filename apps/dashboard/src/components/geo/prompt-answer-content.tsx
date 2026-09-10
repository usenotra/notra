"use client";

import dynamic from "next/dynamic";

import { PromptDetailStatus } from "@/components/geo/prompt-detail-status";
import { PromptReceiptAnalysis } from "@/components/geo/prompt-receipt-analysis";
import type { PromptAnswerContentProps } from "@/types/geo";

const AnswerThread = dynamic(() =>
  import("@/components/geo/geo-prompt-answer-thread").then(
    (module) => module.GeoPromptAnswerThread
  )
);

export function PromptAnswerContent({
  state,
  view,
  onRetry,
  prompt,
  scrollable,
  showHistory,
  history,
  isHistoryLoading,
  competitors,
  onSelectCheck,
}: PromptAnswerContentProps) {
  if (state.status !== "ready") {
    return <PromptDetailStatus onRetry={onRetry} status={state.status} />;
  }

  const { result } = state;
  const promptText = prompt ?? result.prompt;

  if (view === "raw") {
    return (
      <AnswerThread
        scrollable={scrollable}
        prompt={promptText}
        result={result}
      />
    );
  }

  return (
    <PromptReceiptAnalysis
      scrollable={scrollable}
      showHistory={showHistory}
      competitors={competitors}
      history={history}
      isHistoryLoading={isHistoryLoading}
      onSelectCheck={onSelectCheck}
      prompt={promptText}
      result={result}
    />
  );
}
