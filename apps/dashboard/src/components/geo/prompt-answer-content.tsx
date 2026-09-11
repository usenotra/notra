"use client";

import { GeoPromptAnswerSkeleton } from "@/components/geo/geo-prompt-answer-skeleton";
import { GeoPromptAnswerThread } from "@/components/geo/geo-prompt-answer-thread";
import { PromptDetailStatus } from "@/components/geo/prompt-detail-status";
import { PromptReceiptAnalysis } from "@/components/geo/prompt-receipt-analysis";
import type { PromptAnswerContentProps } from "@/types/geo";

export function PromptAnswerContent({
  organizationId,
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
  if (state.status === "loading") {
    return <GeoPromptAnswerSkeleton view={view} />;
  }

  if (state.status !== "ready") {
    return <PromptDetailStatus onRetry={onRetry} status={state.status} />;
  }

  const { result } = state;
  const promptText = prompt ?? result.prompt;

  return (
    <>
      <div
        className={
          view === "raw" ? "flex min-h-full flex-1 flex-col" : "hidden"
        }
      >
        <GeoPromptAnswerThread
          organizationId={organizationId}
          prompt={promptText}
          result={result}
          scrollable={scrollable}
        />
      </div>
      <div className={view === "analysis" ? undefined : "hidden"}>
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
      </div>
    </>
  );
}
