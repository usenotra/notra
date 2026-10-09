"use client";

import { PlayIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { formatAiTrafficTimestamp } from "@notra/geo-core/utils/ai-traffic";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@notra/ui/components/ui/sheet";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { useRetainedValue } from "@notra/ui/hooks/use-retained-value";
import { useReducedMotion } from "motion/react";
import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "use-intl";

import { Button } from "@/components/button";
import { ConversationReplayThread } from "@/components/geo/conversation-replay-thread";
import { PromptEngineSwitcher } from "@/components/geo/prompt-engine-switcher";
import { useAnswerReplay } from "@/lib/hooks/use-answer-replay";
import { useGeoSequenceResults } from "@/lib/hooks/use-geo";
import type {
  ConversationResultsDialogProps,
  GeoSequenceEngineThread,
} from "@/types/geo";
import { buildSequenceEngineThreads } from "@/utils/geo-sequences";

const EMPTY_TURNS: GeoSequenceEngineThread["turns"] = [];

function latestCheckAt(threads: GeoSequenceEngineThread[]): string | null {
  let latest: string | null = null;
  for (const thread of threads) {
    for (const turn of thread.turns) {
      if (!latest || turn.lastCheckedAt > latest) {
        latest = turn.lastCheckedAt;
      }
    }
  }
  return latest;
}

function RunConversationButton({
  onRun,
  isRunning,
  label,
}: {
  onRun: () => void;
  isRunning: boolean;
  label: string;
}) {
  return (
    <Button loading={isRunning} onClick={onRun} size="sm">
      <HugeiconsIcon icon={PlayIcon} size={14} />
      {label}
    </Button>
  );
}

export function ConversationResultsDialog({
  open,
  onOpenChange,
  organizationId,
  sequence: selectedSequence,
  onRun,
  isRunning,
}: ConversationResultsDialogProps) {
  const [sequence, releaseSequence] = useRetainedValue(selectedSequence);
  const { data, isLoading } = useGeoSequenceResults(
    organizationId,
    sequence?.id
  );
  const [engine, setEngine] = useState<string | null>(null);
  const [playToken, setPlayToken] = useState(1);
  const [skipReplay, setSkipReplay] = useState(true);
  const reducedMotion = useReducedMotion();
  const t = useTranslations("geo.conversationResultsDialog");
  const locale = useLocale();

  const threads = useMemo(
    () => buildSequenceEngineThreads(data?.results ?? [], sequence?.id),
    [data, sequence]
  );
  const active =
    threads.find((thread) => thread.engine === engine) ?? threads[0] ?? null;
  const progress = useAnswerReplay(
    active?.turns ?? EMPTY_TURNS,
    playToken,
    Boolean(reducedMotion),
    skipReplay
  );
  const isReplaying = progress !== null;
  const latestCheck = latestCheckAt(threads);

  if (!sequence) {
    return null;
  }

  return (
    <Sheet
      onOpenChange={onOpenChange}
      onOpenChangeComplete={releaseSequence}
      open={open}
    >
      <SheetContent
        className="gap-0 overflow-hidden p-0 transition-none data-[side=right]:inset-y-0 data-[side=right]:h-dvh data-[side=right]:w-full motion-reduce:animate-none sm:rounded-2xl sm:border data-[side=right]:sm:inset-y-2 data-[side=right]:sm:right-2 data-[side=right]:sm:h-[calc(100dvh-1rem)] data-[side=right]:sm:max-w-[min(calc(100vw-2rem),54rem)]"
        side="right"
      >
        <SheetHeader className="shrink-0 gap-3 border-b p-4 pr-12">
          <SheetTitle className="min-w-0 text-sm leading-5 font-medium break-words">
            {sequence.name}
          </SheetTitle>
          <SheetDescription className="sr-only">
            {t("description")}
          </SheetDescription>
          {latestCheck ? (
            <time
              className="text-muted-foreground text-xs tabular-nums"
              dateTime={latestCheck}
            >
              {formatAiTrafficTimestamp(latestCheck, locale)}
            </time>
          ) : null}
          {active ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <PromptEngineSwitcher
                active={active}
                onChange={(next) => {
                  setEngine(next);
                  setSkipReplay(true);
                }}
                results={threads}
              />
              <div className="flex items-center gap-2">
                {isReplaying ? (
                  <Button
                    onClick={() => {
                      setSkipReplay(true);
                    }}
                    size="sm"
                    variant="outline"
                  >
                    {t("skip")}
                  </Button>
                ) : null}
                <Button
                  onClick={() => {
                    setSkipReplay(false);
                    setPlayToken((token) => token + 1);
                  }}
                  size="sm"
                  variant="outline"
                >
                  <HugeiconsIcon icon={PlayIcon} size={14} />
                  {t("replay")}
                </Button>
              </div>
            </div>
          ) : null}
        </SheetHeader>
        <div className="relative min-h-0 flex-1 overflow-hidden">
          {isLoading && (
            <div className="px-6 py-8">
              <Skeleton className="h-40 w-full" />
            </div>
          )}
          {!isLoading && active && (
            <ConversationReplayThread
              engine={active.engine}
              key={active.engine}
              organizationId={organizationId}
              progress={progress}
              turns={active.turns}
            />
          )}
          {!(isLoading || active) && (
            <div className="flex h-full min-h-0 flex-col items-center justify-center gap-4 px-6">
              <p className="text-muted-foreground text-center text-sm text-pretty">
                {t("empty")}
              </p>
              <RunConversationButton
                isRunning={isRunning}
                label={t("runNow")}
                onRun={onRun}
              />
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
