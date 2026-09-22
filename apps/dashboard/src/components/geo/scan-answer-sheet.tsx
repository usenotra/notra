"use client";

import type { GeoPromptReceiptView } from "@notra/geo-core/types/geo";
import {
  Sheet,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@notra/ui/components/ui/sheet";
import { useState } from "react";

import { EngineIcon } from "@/components/geo/engine-icon";
import { PromptAnswerContent } from "@/components/geo/prompt-answer-content";
import { PromptCopyButton } from "@/components/geo/prompt-copy-button";
import {
  PromptAnswerPage,
  PromptAnswerSheetContent,
} from "@/components/geo/prompt-detail-dialog";
import { PromptReceiptViewSwitch } from "@/components/geo/prompt-receipt-view-switch";
import { GEO_PROMPT_DEFAULT_FILTERS } from "@/constants/geo-prompts";
import { useGeoPromptResultDetail } from "@/lib/hooks/use-geo";
import { useGeoPromptsDb } from "@/lib/hooks/use-geo-db";
import { useRetainedValue } from "@/lib/hooks/use-retained-value";
import type { GeoScanAnswerProps } from "@/types/geo-scan-activity";
import { formatEngineWithMode } from "@/utils/geo-charts";
import { geoPromptDetailState } from "@/utils/geo-prompt-detail";
import { buildPromptTableRows } from "@/utils/geo-prompts";

export function ScanAnswerSheet({
  organizationId,
  checkId: checkIdProp,
  onClose,
  scanId,
  initialLanguage,
}: GeoScanAnswerProps) {
  const [view, setView] = useState<GeoPromptReceiptView>("analysis");
  const open = checkIdProp !== null;
  const [checkId, releaseCheckId] = useRetainedValue(checkIdProp);
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

  return (
    <Sheet
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onClose();
        }
      }}
      onOpenChangeComplete={releaseCheckId}
      open={open}
    >
      <PromptAnswerSheetContent>
        {row ? (
          <PromptAnswerPage
            initialEngine={result?.engine}
            initialLanguage={initialLanguage}
            key={`${row.id}-${scanId ?? "latest"}`}
            onPrepareScan={onClose}
            open={open}
            organizationId={organizationId}
            row={{ ...row, prompt: result?.prompt ?? row.prompt }}
            scanId={scanId}
          />
        ) : (
          <>
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
            <PromptAnswerContent
              organizationId={organizationId}
              history={[]}
              isHistoryLoading={false}
              showHistory={false}
              state={geoPromptDetailState(checkId, detail.data, detail.isError)}
              view={view}
              onRetry={() => {
                void detail.refetch();
              }}
            />
          </>
        )}
      </PromptAnswerSheetContent>
    </Sheet>
  );
}
