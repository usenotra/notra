"use client";

import { GEO_CHAT_SKIN_SURFACE } from "@notra/geo-core/constants/geo";
import type {
  GeoPromptReceiptView,
  GeoPromptResultSummary,
} from "@notra/geo-core/types/geo";
import { engineFamilyLabel } from "@notra/geo-core/utils/geo-engine-family";
import { geoScanEmptyMessage } from "@notra/geo-core/utils/geo-scan";
import { tween } from "@notra/ui/lib/motion";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";

import { GeoPromptAnswerSkeleton } from "@/components/geo/geo-prompt-answer-skeleton";
import { PromptAnswerContent } from "@/components/geo/prompt-answer-content";
import { PromptDetailStatus } from "@/components/geo/prompt-detail-status";
import { PromptEngineSwitcher } from "@/components/geo/prompt-engine-switcher";
import { PromptReceiptViewSwitch } from "@/components/geo/prompt-receipt-view-switch";
import {
  useGeoPromptHistory,
  useGeoPromptResultDetail,
} from "@/lib/hooks/use-geo";
import { useGeoCompetitorsDb } from "@/lib/hooks/use-geo-db";
import { cn } from "@/lib/utils";
import type { GeoGapAnswerPanelProps } from "@/types/components/geo-gaps";
import { geoChatSkin } from "@/utils/geo-chat-skin";
import { geoPromptDetailState } from "@/utils/geo-prompt-detail";
import { latestPromptResults } from "@/utils/geo-prompt-history";

/** Engines that already mention you lead, so the strip reads as a scoreboard. */
function byVisibility(
  left: GeoPromptResultSummary,
  right: GeoPromptResultSummary
): number {
  if (left.mentioned !== right.mentioned) {
    return left.mentioned ? -1 : 1;
  }
  return engineFamilyLabel(left.engine).localeCompare(
    engineFamilyLabel(right.engine)
  );
}

/**
 * The gap sheet's body: which engines mention you, and what the engine you
 * picked actually answered. The numbers already live in the table row, so the
 * sheet carries the answer instead of repeating them.
 */
export function GapAnswerPanel({
  organizationId,
  promptId,
  prompt,
  isScanning,
}: GeoGapAnswerPanelProps) {
  const [engine, setEngine] = useState("");
  const [view, setView] = useState<GeoPromptReceiptView>("analysis");
  const reduceMotion = useReducedMotion();
  const history = useGeoPromptHistory(organizationId, promptId, {
    enabled: Boolean(organizationId),
  });
  const results = latestPromptResults(
    [],
    history.data?.checks ?? [],
    promptId,
    prompt
  ).sort(byVisibility);
  const active = results.find((row) => row.engine === engine) ?? results[0];
  const detail = useGeoPromptResultDetail(
    organizationId,
    active?.checkId ?? null
  );
  const { competitors } = useGeoCompetitorsDb(organizationId);
  const detailState = geoPromptDetailState(
    active?.checkId ?? null,
    detail.data,
    detail.isError,
    history.status
  );

  if (history.isPending) {
    return <GeoPromptAnswerSkeleton view={view} />;
  }

  if (history.isError) {
    return <PromptDetailStatus onRetry={history.refetch} status="error" />;
  }

  if (!active) {
    return (
      <div className="flex min-h-48 flex-1 items-center justify-center px-6">
        <p className="text-muted-foreground text-center text-sm text-pretty">
          {geoScanEmptyMessage(
            isScanning,
            "Run a scan to see how engines answer this"
          )}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="flex shrink-0 flex-wrap items-start justify-between gap-x-4 gap-y-3 border-b px-4 py-3">
        <PromptEngineSwitcher
          active={active}
          onChange={(next) => setEngine(next)}
          results={results}
        />
        <PromptReceiptViewSwitch onChange={setView} view={view} />
      </div>

      <div
        className={cn(
          "relative min-h-0 flex-1 overflow-y-auto overscroll-contain",
          view === "raw"
            ? GEO_CHAT_SKIN_SURFACE[geoChatSkin(active.engine)]
            : undefined
        )}
      >
        <AnimatePresence initial={false} mode="wait">
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="flex min-h-full min-w-0 flex-col"
            exit={{ opacity: 0, y: reduceMotion ? 0 : -4 }}
            initial={{ opacity: 0, y: reduceMotion ? 0 : 4 }}
            key={`${active.engine}:${view}`}
            transition={reduceMotion ? { duration: 0 } : tween("fast")}
          >
            <PromptAnswerContent
              competitors={competitors}
              history={[]}
              isHistoryLoading={false}
              onRetry={detail.refetch}
              organizationId={organizationId}
              prompt={prompt}
              scrollable={false}
              showHistory={false}
              state={detailState}
              view={view}
            />
          </motion.div>
        </AnimatePresence>
      </div>
    </>
  );
}
