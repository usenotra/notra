"use client";

import {
  AiChat01Icon,
  Loading03Icon,
  PlayIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { formatAiTrafficTimestamp } from "@notra/geo-core/utils/ai-traffic";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@notra/ui/components/ui/select";
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
import { PersonaPrompts } from "@/components/geo/persona-prompts";
import { PromptEngineSwitcher } from "@/components/geo/prompt-engine-switcher";
import { GeoConversationSkeleton } from "@/components/geo/skeleton-parts";
import {
  GEO_PERSONA_CONVERSATION_EMPTY_DESCRIPTION,
  GEO_PERSONA_CONVERSATION_EMPTY_TITLE,
  GEO_PERSONA_CONVERSATION_PAUSED_DESCRIPTION,
  GEO_PERSONA_DIALOG_VIEWS,
} from "@/constants/geo-personas";
import { useGeoPersonasGenerate } from "@/lib/hooks/use-geo-personas";
import { usePersonaConversation } from "@/lib/hooks/use-persona-conversation";
import type { GeoSequenceEngineThread } from "@/types/geo";
import type {
  PersonaDetailDialogProps,
  PersonaDetailHeaderProps,
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

function PersonaDetailHeader({
  persona,
  threads,
  active,
  scans,
  selectedScanId,
  view,
  isRunning,
  onRun,
  onSelectScan,
  onEngineChange,
  onViewChange,
}: PersonaDetailHeaderProps) {
  const latestCheck = latestCheckAt(threads);
  const selectedScan =
    scans.find((scan) => scan.id === selectedScanId) ?? scans.at(0) ?? null;

  return (
    <SheetHeader className="shrink-0 gap-3 overflow-visible px-6 pt-5 pr-12 pb-3">
      <div className="flex items-start gap-3">
        <PersonaAvatar className="mt-0.5 size-12" persona={persona} size="lg" />
        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="flex min-w-0 items-center gap-3">
            <SheetTitle className="min-w-0 flex-1 text-xl leading-snug font-semibold text-balance">
              {persona.name}
            </SheetTitle>
            <Button
              className="shrink-0"
              disabled={
                !persona.enabled ||
                persona.conversationPrompts.length === 0 ||
                isRunning
              }
              onClick={onRun}
              size="sm"
              type="button"
            >
              <HugeiconsIcon
                className={isRunning ? "animate-spin" : undefined}
                icon={isRunning ? Loading03Icon : PlayIcon}
                size={14}
              />
              {isRunning ? "Running…" : "Run scan"}
            </Button>
          </div>
          <SheetDescription className="text-muted-foreground text-sm leading-snug">
            {persona.role} · {persona.company}
          </SheetDescription>
          {latestCheck ? (
            <SheetDescription className="text-muted-foreground text-xs leading-snug">
              {formatAiTrafficTimestamp(latestCheck)}
            </SheetDescription>
          ) : null}
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          className="gap-0"
          onValueChange={(value) => onViewChange(value as PersonaDialogView)}
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
      </div>
      {view === "conversation" && active ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <PromptEngineSwitcher
            active={active}
            onChange={onEngineChange}
            results={threads}
          />
          {selectedScan && selectedScanId ? (
            <Select
              disabled={isRunning}
              onValueChange={onSelectScan}
              value={selectedScanId}
            >
              <SelectTrigger aria-label="Persona scan history" className="w-44">
                <SelectValue>
                  {selectedScan.id === scans.at(0)?.id ? "Latest · " : ""}
                  {formatAiTrafficTimestamp(selectedScan.capturedAt)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {scans.map((scan, index) => (
                  <SelectItem key={scan.id} value={scan.id}>
                    {index === 0 ? "Latest · " : ""}
                    {formatAiTrafficTimestamp(scan.capturedAt)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
        </div>
      ) : null}
    </SheetHeader>
  );
}

function ConversationEmpty({ enabled }: { enabled: boolean }) {
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
    </div>
  );
}

function PersonaConversation({
  organizationId,
  active,
  isLoading,
  isWaitingForScan,
  enabled,
}: PersonaConversationProps) {
  if (active) {
    return (
      <ConversationReplayThread
        engine={active.engine}
        key={active.engine}
        organizationId={organizationId}
        progress={null}
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
  return <ConversationEmpty enabled={enabled} />;
}

export function PersonaDetailDialog({
  open,
  onOpenChange,
  organizationId,
  persona,
}: PersonaDetailDialogProps) {
  const [view, setView] = useState<PersonaDialogView>(DEFAULT_VIEW);
  const showConversation = view === "conversation";
  const generatePersona = useGeoPersonasGenerate(organizationId);
  const {
    runPersona,
    threads,
    active,
    isWaitingForScan,
    isConversationLoading: showConversationLoading,
    scans,
    selectedScanId,
    selectScan,
    setEngine,
  } = usePersonaConversation(organizationId, persona, open, showConversation);

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
        }}
        side="right"
        className="flex flex-col gap-0 overflow-hidden p-0 data-[side=right]:inset-y-0 data-[side=right]:h-dvh data-[side=right]:w-full sm:rounded-2xl sm:border data-[side=right]:sm:inset-y-2 data-[side=right]:sm:right-2 data-[side=right]:sm:h-[calc(100dvh-1rem)] data-[side=right]:sm:max-w-[min(calc(100vw-2rem),40rem)]"
      >
        <PersonaDetailHeader
          active={active}
          isRunning={runPersona.isPending}
          onEngineChange={setEngine}
          onRun={() =>
            runPersona.mutate(persona.id, {
              onSuccess: () => selectScan(null),
            })
          }
          onSelectScan={selectScan}
          onViewChange={setView}
          persona={persona}
          scans={scans}
          selectedScanId={selectedScanId}
          view={view}
          threads={threads}
        />

        <div className="relative min-h-0 flex-1 overflow-hidden border-t">
          {showConversation ? (
            <PersonaConversation
              organizationId={organizationId}
              active={active}
              isLoading={showConversationLoading}
              isWaitingForScan={isWaitingForScan}
              enabled={persona.enabled}
            />
          ) : null}
          {view === "prompts" ? (
            <PersonaPrompts
              disabled={generatePersona.isPending}
              isGenerating={
                generatePersona.isPending &&
                generatePersona.generatingPersonaId === persona.id
              }
              onGenerate={() =>
                generatePersona.mutate({
                  personaId: persona.id,
                  promptsOnly: true,
                })
              }
              prompts={persona.conversationPrompts}
            />
          ) : null}
          <div hidden={view !== "profile"} className="h-full">
            <PersonaProfileEditor
              key={`${persona.id}:${persona.updatedAt}`}
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
