"use client";

import {
  AiChat01Icon,
  Loading03Icon,
  PlayIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { formatAiTrafficTimestamp } from "@notra/geo-core/utils/ai-traffic";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@notra/ui/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@notra/ui/components/ui/tabs";
import { useState } from "react";

import { Button } from "@/components/button";
import { ConversationReplayThread } from "@/components/geo/conversation-replay-thread";
import { PersonaAvatar } from "@/components/geo/persona-avatar";
import { PersonaProfileEditor } from "@/components/geo/persona-profile-editor";
import { PromptEngineSwitcher } from "@/components/geo/prompt-engine-switcher";
import { GeoConversationSkeleton } from "@/components/geo/skeleton-parts";
import {
  GEO_PERSONA_CONVERSATION_EMPTY_DESCRIPTION,
  GEO_PERSONA_CONVERSATION_EMPTY_TITLE,
  GEO_PERSONA_CONVERSATION_PAUSED_DESCRIPTION,
  GEO_PERSONA_DIALOG_VIEWS,
} from "@/constants/geo-personas";
import { usePersonaConversation } from "@/lib/hooks/use-persona-conversation";
import type { GeoSequenceEngineThread } from "@/types/geo";
import type {
  PersonaDetailDialogProps,
  PersonaConversationProps,
  PersonaDialogView,
} from "@/types/geo-personas-ui";
import {
  adjacentPromptEngine,
  promptEngineArrowDelta,
} from "@/utils/geo-prompt-engines";

const DEFAULT_VIEW: PersonaDialogView = "profile";

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

function ConversationEmpty({
  enabled,
  isScanning,
  onRunScan,
}: {
  enabled: boolean;
  isScanning: boolean;
  onRunScan: () => void;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col items-center justify-center gap-4 px-6 pb-6">
      <div className="bg-muted text-muted-foreground flex size-10 items-center justify-center rounded-full">
        <HugeiconsIcon icon={AiChat01Icon} size={18} />
      </div>
      <div className="space-y-1 text-center">
        <p className="text-sm font-medium">
          {GEO_PERSONA_CONVERSATION_EMPTY_TITLE}
        </p>
        <p className="text-muted-foreground text-sm text-pretty">
          {enabled
            ? GEO_PERSONA_CONVERSATION_EMPTY_DESCRIPTION
            : GEO_PERSONA_CONVERSATION_PAUSED_DESCRIPTION}
        </p>
      </div>
      {enabled ? (
        <Button disabled={isScanning} onClick={onRunScan} size="sm">
          <HugeiconsIcon
            className={isScanning ? "animate-spin" : undefined}
            icon={isScanning ? Loading03Icon : PlayIcon}
            size={14}
          />
          {isScanning ? "Scanning…" : "Run scan"}
        </Button>
      ) : null}
    </div>
  );
}

function PersonaConversation({
  active,
  progress,
  isLoading,
  isWaitingForScan,
  enabled,
  isScanning,
  onRunScan,
}: PersonaConversationProps) {
  if (active) {
    return (
      <ConversationReplayThread
        engine={active.engine}
        key={active.engine}
        progress={progress}
        turns={active.turns}
      />
    );
  }
  if (isLoading) {
    return (
      <div className="h-full overflow-y-auto" aria-busy="true">
        <p
          role="status"
          className="text-muted-foreground mx-auto w-full max-w-3xl px-6 pt-6 text-sm"
        >
          {isWaitingForScan
            ? "Scan in progress. This persona’s conversation will appear when results are ready."
            : "Loading conversation…"}
        </p>
        <GeoConversationSkeleton />
      </div>
    );
  }
  return (
    <ConversationEmpty
      enabled={enabled}
      isScanning={isScanning}
      onRunScan={onRunScan}
    />
  );
}

export function PersonaDetailDialog({
  open,
  onOpenChange,
  organizationId,
  persona,
}: PersonaDetailDialogProps) {
  const [view, setView] = useState<PersonaDialogView>(DEFAULT_VIEW);
  const showConversation = view === "conversation";
  const {
    startScan,
    isScanning,
    threads,
    active,
    progress,
    isWaitingForScan,
    isConversationLoading: showConversationLoading,
    setEngine,
    setPlayToken,
    setSkipReplay,
  } = usePersonaConversation(organizationId, persona, open, showConversation);
  const isReplaying = progress !== null;
  const latestCheck = latestCheckAt(threads);

  if (!persona) {
    return null;
  }

  return (
    <Sheet onOpenChange={onOpenChange} open={open}>
      <SheetContent
        onKeyDown={(event) => {
          if (!showConversation || !active || event.defaultPrevented) {
            return;
          }
          if (
            event.target instanceof HTMLElement &&
            event.target.closest(
              '[role="tablist"], [role="menu"], [role="listbox"]'
            )
          ) {
            return;
          }
          const delta = promptEngineArrowDelta(event, threads.length);
          if (delta === null) {
            return;
          }
          event.preventDefault();
          setEngine(
            adjacentPromptEngine(
              threads.map((thread) => thread.engine),
              active.engine,
              delta
            )
          );
          setSkipReplay(false);
          setPlayToken((token) => token + 1);
        }}
        side="right"
        className="flex flex-col gap-0 overflow-hidden p-0 data-[side=right]:inset-y-0 data-[side=right]:h-dvh data-[side=right]:w-full sm:rounded-2xl sm:border data-[side=right]:sm:inset-y-2 data-[side=right]:sm:right-2 data-[side=right]:sm:h-[calc(100dvh-1rem)] data-[side=right]:sm:max-w-[min(calc(100vw-2rem),40rem)]"
      >
        <SheetHeader className="shrink-0 gap-3 overflow-visible px-6 pt-5 pr-12 pb-3">
          <div className="flex items-center gap-3">
            <PersonaAvatar className="size-12" persona={persona} size="lg" />
            <div className="min-w-0 space-y-0.5">
              <SheetTitle className="text-xl leading-snug font-semibold text-balance">
                {persona.name}
              </SheetTitle>
              <SheetDescription className="text-muted-foreground text-sm">
                {persona.role} · {persona.company}
                {latestCheck
                  ? ` · ${formatAiTrafficTimestamp(latestCheck)}`
                  : null}
              </SheetDescription>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Tabs
              className="gap-0"
              onValueChange={(value) => setView(value as PersonaDialogView)}
              value={view}
            >
              <TabsList aria-label="View">
                {GEO_PERSONA_DIALOG_VIEWS.map((option) => (
                  <TabsTrigger
                    className="px-2.5 text-xs"
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            {showConversation && active ? (
              <div className="flex items-center gap-2">
                {isReplaying ? (
                  <Button
                    onClick={() => setSkipReplay(true)}
                    size="sm"
                    variant="outline"
                  >
                    Skip
                  </Button>
                ) : null}
                <Button
                  aria-label="Replay this conversation"
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
            ) : null}
          </div>
          {showConversation && active ? (
            <PromptEngineSwitcher
              active={active}
              onChange={(next) => {
                setEngine(next);
                setSkipReplay(false);
                setPlayToken((token) => token + 1);
              }}
              results={threads}
            />
          ) : null}
        </SheetHeader>

        <div className="relative min-h-0 flex-1 overflow-hidden border-t">
          {showConversation ? (
            <PersonaConversation
              active={active}
              progress={progress}
              isLoading={showConversationLoading}
              isWaitingForScan={isWaitingForScan}
              enabled={persona.enabled}
              isScanning={isScanning}
              onRunScan={() => startScan.mutate("personas_empty")}
            />
          ) : null}
          <div hidden={showConversation} className="h-full">
            <PersonaProfileEditor
              key={persona.id}
              persona={persona}
              organizationId={organizationId}
              onCancel={() => onOpenChange(false)}
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
