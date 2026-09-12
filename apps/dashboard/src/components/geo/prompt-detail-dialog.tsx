"use client";

import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  GEO_CHAT_SKIN_SURFACE,
  GEO_PROMPT_HISTORY_ANSWER_LABELS,
  GEO_PROMPT_MAX_TAGS,
} from "@notra/geo-core/constants/geo";
import type {
  GeoPromptHistoryCheck,
  GeoPromptReceiptView,
  GeoPromptResultSummary,
} from "@notra/geo-core/types/geo";
import { formatAiTrafficTimestamp } from "@notra/geo-core/utils/ai-traffic";
import { geoPromptIntentLabel } from "@notra/geo-core/utils/geo-prompt-intent";
import { normalizePromptTags } from "@notra/geo-core/utils/geo-prompt-tags";
import { geoScanEmptyMessage } from "@notra/geo-core/utils/geo-scan";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@notra/ui/components/ui/sheet";
import { tween } from "@notra/ui/lib/motion";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type KeyboardEvent, useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/button";
import { GeoPromptAnswerSkeleton } from "@/components/geo/geo-prompt-answer-skeleton";
import { GeoPromptAnswerThread } from "@/components/geo/geo-prompt-answer-thread";
import { GeoTagList } from "@/components/geo/geo-tag-list";
import { PromptAnswerContent } from "@/components/geo/prompt-answer-content";
import { PromptCopyButton } from "@/components/geo/prompt-copy-button";
import { PromptDetailStatus } from "@/components/geo/prompt-detail-status";
import { PromptEngineSwitcher } from "@/components/geo/prompt-engine-switcher";
import { PromptReceiptViewSwitch } from "@/components/geo/prompt-receipt-view-switch";
import { PromptScanButton } from "@/components/geo/prompt-scan-button";
import {
  GeoScanControlsProvider,
  useGeoScanControls,
} from "@/components/providers/geo-scan-controls-provider";
import { useOrganizationsContext } from "@/components/providers/organization-provider";
import { GEO_PROMPT_DETAIL_SURFACES } from "@/constants/geo-analytics";
import { GEO_PROMPT_TAGS_COPY } from "@/constants/geo-prompts";
import { trackEvent } from "@/lib/analytics/posthog-client";
import { useGeoCompetitors } from "@/lib/hooks/use-geo";
import { useGeoPromptsDb } from "@/lib/hooks/use-geo-db";
import { usePromptAnswerSelection } from "@/lib/hooks/use-prompt-answer-selection";
import { cn } from "@/lib/utils";
import type {
  PromptAnswerPageProps,
  PromptDetailDialogProps,
} from "@/types/geo";
import type {
  PromptAnswerBodyProps,
  PromptAnswerEmptyProps,
  PromptAnswerHeaderProps,
  PromptAnswerLanguageBarProps,
  PromptAnswerTagsFooterProps,
  PromptDetailOpenedEventProps,
} from "@/types/geo-prompt-detail";
import { sharedEngineAnswerMode } from "@/utils/geo-charts";
import { geoChatSkin } from "@/utils/geo-chat-skin";
import {
  adjacentPromptEngine,
  promptEngineArrowDelta,
} from "@/utils/geo-prompt-engines";
import { promptResultFromHistoryCheck } from "@/utils/geo-prompt-history";

const INSTANT = { duration: 0 } as const;
const SLIDE_PX = 18;

function usePromptDetailOpened({
  open,
  surface,
  engine,
  engineCount,
  promptId,
}: PromptDetailOpenedEventProps) {
  const openedRef = useRef(false);
  useEffect(() => {
    if (!open) {
      openedRef.current = false;
      return;
    }
    if (openedRef.current) {
      return;
    }
    openedRef.current = true;
    trackEvent(POSTHOG_EVENTS.GEO_PROMPT_DETAIL_OPENED, {
      surface: surface ?? GEO_PROMPT_DETAIL_SURFACES.PROMPTS_TABLE,
      engine,
      engine_count: engineCount,
      prompt_id: promptId,
    });
  }, [engine, engineCount, open, promptId, surface]);
}

function threadVariants(reduceMotion: boolean) {
  return {
    enter: (direction: number) => ({
      opacity: 0,
      x: reduceMotion ? 0 : direction * SLIDE_PX,
    }),
    center: { opacity: 1, x: 0 },
    exit: (direction: number) => ({
      opacity: 0,
      x: reduceMotion ? 0 : direction * -SLIDE_PX,
    }),
  };
}

function latestPromptCheckAt(
  results: readonly GeoPromptResultSummary[]
): string | null {
  let latest: string | null = null;
  for (const result of results) {
    if (!latest || result.lastCheckedAt > latest) {
      latest = result.lastCheckedAt;
    }
  }
  return latest;
}

function HistoryAnswerBanner({
  check,
  onBack,
}: {
  check: GeoPromptHistoryCheck;
  onBack: () => void;
}) {
  return (
    <div className="bg-muted/40 flex shrink-0 items-center justify-between gap-3 border-b px-6 py-2 text-sm">
      <p className="text-muted-foreground">
        {GEO_PROMPT_HISTORY_ANSWER_LABELS.scanFrom}{" "}
        <time
          className="text-foreground tabular-nums"
          dateTime={check.capturedAt}
        >
          {formatAiTrafficTimestamp(check.capturedAt)}
        </time>
      </p>
      <Button onClick={onBack} size="sm" type="button" variant="ghost">
        <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} />
        {GEO_PROMPT_HISTORY_ANSWER_LABELS.backToLatest}
      </Button>
    </div>
  );
}

function PromptAnswerHeader({
  promptText,
  onPrepareScan,
  organizationId,
  row,
  results,
  active,
  view,
  onSelectEngine,
  onSelectView,
}: PromptAnswerHeaderProps) {
  const answerMode = sharedEngineAnswerMode(
    results.map((result) => result.engine)
  );
  const latestCheck = active?.lastCheckedAt ?? latestPromptCheckAt(results);

  return (
    <SheetHeader className="shrink-0 gap-3 border-b p-4">
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 pr-8">
        <SheetTitle className="min-w-0 text-sm leading-5 font-medium">
          <PromptCopyButton prompt={promptText ?? row.prompt} />
        </SheetTitle>
        <SheetDescription className="sr-only">
          {answerMode
            ? `Latest ${answerMode} answer from each engine`
            : "Latest answer from each engine"}
        </SheetDescription>
        {latestCheck ? (
          <time
            className="text-muted-foreground shrink-0 text-xs tabular-nums"
            dateTime={latestCheck}
          >
            {formatAiTrafficTimestamp(latestCheck)}
          </time>
        ) : null}
        <div className="ml-auto flex shrink-0 items-center gap-1">
          <PromptScanButton
            onPrepare={onPrepareScan}
            organizationId={organizationId}
            row={row}
          />
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
        <div>
          <dt className="text-muted-foreground text-xs">Intent</dt>
          <dd>{geoPromptIntentLabel(row.intent)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-xs">Best position</dt>
          <dd className="tabular-nums">
            {row.bestPosition === null ? "Not ranked" : `#${row.bestPosition}`}
          </dd>
        </div>
      </dl>
      {results.length > 0 && active ? (
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
          <PromptEngineSwitcher
            active={active}
            onChange={onSelectEngine}
            results={results}
          />
          <PromptReceiptViewSwitch onChange={onSelectView} view={view} />
        </div>
      ) : null}
    </SheetHeader>
  );
}

function PromptAnswerBody({
  organizationId,
  detailState,
  view,
  prompt,
  scanPromptId,
  selectedCheck,
  history,
  isHistoryLoading,
  competitors,
  onRetry,
  onSelectCheck,
  onBackToLatest,
}: PromptAnswerBodyProps) {
  if (selectedCheck) {
    return (
      <>
        <HistoryAnswerBanner check={selectedCheck} onBack={onBackToLatest} />
        <GeoPromptAnswerThread
          organizationId={organizationId}
          scrollable={false}
          prompt={prompt}
          result={promptResultFromHistoryCheck(
            selectedCheck,
            scanPromptId,
            prompt
          )}
        />
      </>
    );
  }

  return (
    <PromptAnswerContent
      organizationId={organizationId}
      state={detailState}
      view={view}
      onRetry={onRetry}
      scrollable={false}
      competitors={competitors}
      history={history}
      isHistoryLoading={isHistoryLoading}
      onSelectCheck={onSelectCheck}
      prompt={prompt}
    />
  );
}

function PromptAnswerEmpty({
  isScanning,
  detailState,
  view,
  onRetry,
}: PromptAnswerEmptyProps) {
  if (detailState.status === "loading") {
    return <GeoPromptAnswerSkeleton view={view} />;
  }
  if (detailState.status === "error") {
    return <PromptDetailStatus onRetry={onRetry} status={detailState.status} />;
  }
  return (
    <div className="flex min-h-48 items-center justify-center px-6">
      <p className="text-muted-foreground text-center text-sm text-pretty">
        {geoScanEmptyMessage(
          isScanning,
          "Run a scan to see how engines answer this"
        )}
      </p>
    </div>
  );
}

function PromptAnswerLanguageBar({
  languages,
  selectedLanguage,
  onSelect,
}: PromptAnswerLanguageBarProps) {
  return (
    <div
      className="flex shrink-0 flex-wrap gap-1 border-b px-4 py-2"
      aria-label="Answer language"
      role="group"
    >
      {languages.map((item) => (
        <Button
          key={item}
          aria-pressed={item === selectedLanguage}
          onClick={() => onSelect(item)}
          size="sm"
          variant={item === selectedLanguage ? "secondary" : "ghost"}
        >
          {item}
        </Button>
      ))}
    </div>
  );
}

function PromptAnswerTagsFooter({
  tagsInputId,
  row,
  tags,
  pending,
  onChange,
}: PromptAnswerTagsFooterProps) {
  return (
    <section
      className="bg-muted/20 shrink-0 space-y-3 border-t px-4 pt-3 pb-4"
      aria-labelledby={`${tagsInputId}-heading`}
    >
      <h3 className="text-sm font-medium" id={`${tagsInputId}-heading`}>
        Tags
      </h3>
      {row.source === "auto" ? (
        <p className="text-sm break-words">
          {tags.length > 0 ? tags.join(", ") : "No tags"}
        </p>
      ) : (
        <GeoTagList
          disabled={pending}
          id={tagsInputId}
          inline
          inputClassName="h-7 min-w-24 flex-1 basis-24 rounded-none border-0 bg-transparent px-1 text-sm shadow-none focus-visible:ring-0 dark:bg-transparent"
          label={GEO_PROMPT_TAGS_COPY.label}
          labeled={false}
          max={GEO_PROMPT_MAX_TAGS}
          onChange={onChange}
          placeholder="Add a tag…"
          values={tags}
        />
      )}
    </section>
  );
}

function PromptAnswerPage({
  onPrepareScan,
  row,
  open,
  organizationId,
  isScanning = false,
  surface,
  initialEngine,
  scanId,
  initialLanguage,
}: PromptAnswerPageProps) {
  const {
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
    onRetry,
    detailState,
    engineHistory,
    promptText,
  } = usePromptAnswerSelection({
    row,
    organizationId,
    open,
    scanId,
    initialLanguage,
    initialEngine,
  });
  const tagsInputId = useId();
  const { prompts, pendingPromptIds, setPromptTags } =
    useGeoPromptsDb(organizationId);
  const tags = prompts.find((prompt) => prompt.id === row.id)?.tags ?? row.tags;
  const [view, setView] = useState<GeoPromptReceiptView>("analysis");
  const [selectedCheck, setSelectedCheck] =
    useState<GeoPromptHistoryCheck | null>(null);
  const [direction, setDirection] = useState(1);
  const reduceMotion = useReducedMotion();
  const competitors = useGeoCompetitors(organizationId);
  const threadTransition = reduceMotion ? INSTANT : tween("slow", "emphasized");
  const showLanguageBar = Boolean(scanId) && languages.length > 1;

  usePromptDetailOpened({
    open,
    surface,
    engine: active?.engine ?? null,
    engineCount: results.length,
    promptId: row.id,
  });

  function selectEngine(next: string, nextDirection: number) {
    if (next === engine) {
      return;
    }
    setDirection(nextDirection);
    setEngine(next);
    setSelectedCheck(null);
  }

  function selectView(next: GeoPromptReceiptView) {
    setView(next);
    if (next === "analysis") {
      setSelectedCheck(null);
    }
  }

  function openHistoryAnswer(check: GeoPromptHistoryCheck) {
    setSelectedCheck(check);
    setView("raw");
  }

  function handleArrowNavigation(event: KeyboardEvent<HTMLElement>) {
    const delta = promptEngineArrowDelta(event, results.length);
    if (delta === null) {
      return;
    }

    event.preventDefault();
    selectEngine(
      adjacentPromptEngine(engines, active?.engine ?? engine, delta),
      delta
    );
  }

  return (
    <SheetContent
      className="gap-0 overflow-hidden p-0 transition-none data-[side=right]:inset-y-0 data-[side=right]:h-dvh data-[side=right]:w-full motion-reduce:animate-none sm:rounded-2xl sm:border data-[side=right]:sm:inset-y-2 data-[side=right]:sm:right-2 data-[side=right]:sm:h-[calc(100dvh-1rem)] data-[side=right]:sm:max-w-[min(calc(100vw-2rem),54rem)]"
      onKeyDown={handleArrowNavigation}
      side="right"
    >
      <PromptAnswerHeader
        promptText={promptText}
        onPrepareScan={onPrepareScan}
        organizationId={organizationId}
        active={active}
        onSelectEngine={selectEngine}
        onSelectView={selectView}
        row={row}
        results={results}
        view={view}
      />
      {showLanguageBar ? (
        <PromptAnswerLanguageBar
          languages={languages}
          onSelect={(item) => {
            setLanguage(item);
            setSelectedCheck(null);
          }}
          selectedLanguage={selectedLanguage}
        />
      ) : null}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div
          className={cn(
            "relative min-h-0 flex-1 overflow-y-auto overscroll-contain",
            view === "raw" && active
              ? GEO_CHAT_SKIN_SURFACE[geoChatSkin(active.engine)]
              : undefined
          )}
        >
          <AnimatePresence custom={direction} initial={false} mode="popLayout">
            {active ? (
              <motion.div
                animate="center"
                className="flex min-h-full min-w-0 flex-col"
                custom={direction}
                exit="exit"
                initial="enter"
                key={active.engine}
                transition={threadTransition}
                variants={threadVariants(Boolean(reduceMotion))}
              >
                <PromptAnswerBody
                  organizationId={organizationId}
                  competitors={competitors.data?.competitors}
                  detailState={detailState}
                  history={engineHistory}
                  isHistoryLoading={history.isPending}
                  onBackToLatest={() => setSelectedCheck(null)}
                  onRetry={onRetry}
                  onSelectCheck={openHistoryAnswer}
                  prompt={promptText}
                  scanPromptId={scanPromptId}
                  selectedCheck={selectedCheck}
                  view={view}
                />
              </motion.div>
            ) : (
              <PromptAnswerEmpty
                detailState={detailState}
                isScanning={isScanning}
                onRetry={onRetry}
                view={view}
              />
            )}
          </AnimatePresence>
        </div>
        {view === "analysis" ? (
          <PromptAnswerTagsFooter
            onChange={(nextTags) =>
              setPromptTags(row.id, normalizePromptTags(nextTags))
            }
            pending={pendingPromptIds.has(row.id)}
            row={row}
            tags={tags}
            tagsInputId={tagsInputId}
          />
        ) : null}
      </div>
    </SheetContent>
  );
}

export function PromptDetailDialog({
  open,
  onOpenChange,
  row,
  isScanning = false,
  surface,
  organizationId,
  initialEngine,
  scanId,
  initialLanguage,
}: PromptDetailDialogProps) {
  const { activeOrganization } = useOrganizationsContext();
  const scanControls = useGeoScanControls();
  const resolvedOrganizationId = organizationId ?? activeOrganization?.id ?? "";

  const content = row ? (
    <Sheet onOpenChange={onOpenChange} open={open}>
      <PromptAnswerPage
        onPrepareScan={() => onOpenChange(false)}
        initialEngine={initialEngine}
        initialLanguage={initialLanguage}
        scanId={scanId}
        isScanning={isScanning}
        key={`${row.id}-${scanId ?? "latest"}`}
        open={open}
        organizationId={resolvedOrganizationId}
        row={row}
        surface={surface}
      />
    </Sheet>
  ) : null;
  return scanControls ? (
    content
  ) : (
    <GeoScanControlsProvider organizationId={resolvedOrganizationId}>
      {content}
    </GeoScanControlsProvider>
  );
}
