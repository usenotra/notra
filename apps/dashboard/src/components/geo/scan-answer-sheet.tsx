"use client";

import type { GeoPromptReceiptView } from "@notra/geo-core/types/geo";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@notra/ui/components/ui/sheet";
import dynamic from "next/dynamic";
import { useState } from "react";

import { EngineIcon } from "@/components/geo/engine-icon";
import { PromptCopyButton } from "@/components/geo/prompt-copy-button";
import { PromptDetailDialog } from "@/components/geo/prompt-detail-dialog";
import { PromptDetailStatus } from "@/components/geo/prompt-detail-status";
import { PromptReceiptAnalysis } from "@/components/geo/prompt-receipt-analysis";
import { PromptReceiptViewSwitch } from "@/components/geo/prompt-receipt-view-switch";
import { GEO_PROMPT_DEFAULT_FILTERS } from "@/constants/geo-prompts";
import { useGeoPromptResultDetail } from "@/lib/hooks/use-geo";
import { useGeoPromptsDb } from "@/lib/hooks/use-geo-db";
import type {
  GeoScanAnswerProps,
  GeoScanAnswerContentProps,
} from "@/types/geo-scan-activity";
import { formatEngineWithMode } from "@/utils/geo-charts";
import { geoPromptDetailState } from "@/utils/geo-prompt-detail";
import { buildPromptTableRows } from "@/utils/geo-prompts";

const AnswerThread = dynamic(() =>
  import("@/components/geo/geo-prompt-answer-thread").then(
    (module) => module.GeoPromptAnswerThread
  )
);

function ScanAnswerContent({
  state,
  view,
  onRetry,
}: GeoScanAnswerContentProps) {
  if (state.status !== "ready") {
    return <PromptDetailStatus status={state.status} onRetry={onRetry} />;
  }
  const { result } = state;
  if (view === "raw") {
    return <AnswerThread prompt={result.prompt} result={result} />;
  }
  return (
    <PromptReceiptAnalysis
      history={[]}
      isHistoryLoading={false}
      onSelectCheck={() => {}}
      prompt={result.prompt}
      result={result}
      showHistory={false}
    />
  );
}

export function ScanAnswerSheet({
  organizationId,
  checkId,
  onClose,
  scanId,
  initialLanguage,
}: GeoScanAnswerProps) {
  const [view, setView] = useState<GeoPromptReceiptView>("analysis");
  const detail = useGeoPromptResultDetail(organizationId, checkId);
  const result = detail.data?.result;
  const { prompts } = useGeoPromptsDb(organizationId);
  const row =
    result && checkId
      ? buildPromptTableRows(
          prompts,
          [{ ...result, checkId }],
          GEO_PROMPT_DEFAULT_FILTERS
        ).find((item) =>
          item.results.some((answer) => answer.promptId === result.promptId)
        )
      : undefined;

  if (row) {
    return (
      <PromptDetailDialog
        initialEngine={result?.engine}
        initialLanguage={initialLanguage}
        scanId={scanId}
        onOpenChange={(open) => {
          if (!open) {
            onClose();
          }
        }}
        open={checkId !== null}
        organizationId={organizationId}
        row={{ ...row, prompt: result?.prompt ?? row.prompt }}
      />
    );
  }

  return (
    <Sheet
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
      open={checkId !== null}
    >
      <SheetContent className="gap-0 overflow-hidden p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-3xl">
        <SheetHeader className="shrink-0 gap-3 border-b p-4">
          <SheetTitle className="min-w-0 pr-8 text-sm leading-5 font-medium">
            {result ? (
              <PromptCopyButton prompt={result.prompt} />
            ) : (
              "Scan answer"
            )}
          </SheetTitle>
          <SheetDescription className="sr-only">
            Saved prompt result from this scan
          </SheetDescription>
          {result ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-sm">
                <EngineIcon className="size-4" engine={result.engine} />
                {formatEngineWithMode(result.engine)}
              </span>
              <PromptReceiptViewSwitch onChange={setView} view={view} />
            </div>
          ) : null}
        </SheetHeader>
        <ScanAnswerContent
          state={geoPromptDetailState(checkId, detail.data, detail.isError)}
          view={view}
          onRetry={() => {
            void detail.refetch();
          }}
        />
      </SheetContent>
    </Sheet>
  );
}
