"use client";

import { Loading03Icon, PlayIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { formatAiTrafficTimestamp } from "@notra/geo-core/utils/ai-traffic";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@notra/ui/components/shared/responsive-dialog";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { useReducedMotion } from "motion/react";
import { useMemo, useState } from "react";

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
    <Button disabled={isRunning} onClick={onRun} size="sm">
      <HugeiconsIcon
        className={isRunning ? "animate-spin" : undefined}
        icon={isRunning ? Loading03Icon : PlayIcon}
        size={14}
      />
      {isRunning ? "Playing against the engines…" : label}
    </Button>
  );
}

export function ConversationResultsDialog({
  open,
  onOpenChange,
  organizationId,
  sequence,
  onRun,
  isRunning,
}: ConversationResultsDialogProps) {
  const { data, isLoading } = useGeoSequenceResults(
    organizationId,
    open ? sequence?.id : undefined
  );
  const [engine, setEngine] = useState<string | null>(null);
  const [playToken, setPlayToken] = useState(1);
  const [skipReplay, setSkipReplay] = useState(true);
  const reducedMotion = useReducedMotion();

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
    <ResponsiveDialog onOpenChange={onOpenChange} open={open}>
      <ResponsiveDialogContent
        className="flex h-[min(calc(100vh-2rem),900px)] max-h-[calc(100vh-2rem)] w-full max-w-[min(calc(100vw-2rem),72rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[min(calc(100vw-2rem),72rem)]"
        drawerClassName="h-[94svh] max-h-[94svh]"
      >
        <ResponsiveDialogHeader className="shrink-0 gap-3 overflow-visible px-6 pt-5 pr-12 pb-3">
          <ResponsiveDialogTitle className="text-xl leading-snug font-semibold text-balance">
            {sequence.name}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription className="sr-only">
            Where your brand shows up as the conversation unfolds.
          </ResponsiveDialogDescription>
          {latestCheck ? (
            <p className="text-muted-foreground text-sm">
              {formatAiTrafficTimestamp(latestCheck)}
            </p>
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
                    Skip
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
                  Replay
                </Button>
              </div>
            </div>
          ) : null}
        </ResponsiveDialogHeader>
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
                No results yet. Play this conversation against the engines to
                see where your brand shows up.
              </p>
              <RunConversationButton
                isRunning={isRunning}
                label="Run conversation now"
                onRun={onRun}
              />
            </div>
          )}
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
