"use client";

import {
  AiChat01Icon,
  Loading03Icon,
  PlayIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { formatAiTrafficTimestamp } from "@notra/geo-core/utils/ai-traffic";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@notra/ui/components/shared/responsive-dialog";
import { Badge } from "@notra/ui/components/ui/badge";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@notra/ui/components/ui/tabs";
import { useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/button";
import { ConversationReplayThread } from "@/components/geo/conversation-replay-thread";
import { PersonaAvatar } from "@/components/geo/persona-avatar";
import { PromptEngineSwitcher } from "@/components/geo/prompt-engine-switcher";
import {
  GEO_PERSONA_CONVERSATION_EMPTY_DESCRIPTION,
  GEO_PERSONA_CONVERSATION_EMPTY_TITLE,
  GEO_PERSONA_CONVERSATION_PAUSED_DESCRIPTION,
  GEO_PERSONA_DIALOG_VIEWS,
  GEO_PERSONA_PROFILE_SECTIONS,
} from "@/constants/geo-personas";
import { useAnswerReplay } from "@/lib/hooks/use-answer-replay";
import { useGeoStartScan, useIsGeoScanning } from "@/lib/hooks/use-geo";
import { useGeoPersonaResults } from "@/lib/hooks/use-geo-personas";
import type { GeoSequenceEngineThread } from "@/types/geo";
import type {
  PersonaBulletListProps,
  PersonaDetailDialogProps,
  PersonaDialogView,
  PersonaProfileProps,
  PersonaSectionProps,
} from "@/types/geo-personas-ui";
import {
  groupPersonaMemories,
  personaProfilePoints,
  toPersonaEngineThreads,
} from "@/utils/geo-personas";

const EMPTY_TURNS: GeoSequenceEngineThread["turns"] = [];
const STACK_SECTION_KEY = "currentStack";
const DEFAULT_VIEW: PersonaDialogView = "conversation";

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

function Section({ title, children }: PersonaSectionProps) {
  return (
    <section className="space-y-2">
      <h3 className="text-muted-foreground text-[11px] font-medium tracking-wider uppercase">
        {title}
      </h3>
      {children}
    </section>
  );
}

function BulletList({ items }: PersonaBulletListProps) {
  return (
    <ul className="space-y-1.5">
      {items.map((item) => (
        <li
          className="flex gap-2.5 text-sm leading-snug text-pretty"
          key={item}
        >
          <span
            aria-hidden="true"
            className="bg-muted-foreground/50 mt-[0.55em] size-1 shrink-0 rounded-full"
          />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function ChipList({ items }: PersonaBulletListProps) {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <li key={item}>
          <Badge className="font-normal" variant="outline">
            {item}
          </Badge>
        </li>
      ))}
    </ul>
  );
}

function PersonaProfile({ persona }: PersonaProfileProps) {
  const memoryGroups = groupPersonaMemories(persona.memories);
  const stack = persona.profile.currentStack;

  return (
    <div className="space-y-8 px-6 py-5">
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <Section title="Overview">
            <BulletList items={personaProfilePoints(persona.summary)} />
          </Section>
          <Section title="How they search">
            <BulletList items={personaProfilePoints(persona.searchStyle)} />
          </Section>
          {stack.length > 0 ? (
            <Section title="Current stack">
              <ChipList items={stack} />
            </Section>
          ) : null}
        </div>
        <div className="space-y-6">
          {GEO_PERSONA_PROFILE_SECTIONS.map((section) => {
            const items = persona.profile[section.key];
            if (section.key === STACK_SECTION_KEY || items.length === 0) {
              return null;
            }
            return (
              <Section key={section.key} title={section.label}>
                <BulletList items={items} />
              </Section>
            );
          })}
        </div>
      </div>

      {memoryGroups.length > 0 ? (
        <Section title="Memory">
          <ul className="divide-border/60 divide-y rounded-xl border">
            {memoryGroups.flatMap((group) =>
              group.memories.map((memory) => (
                <li
                  className="flex items-start gap-3 px-3 py-2.5"
                  key={memory.id}
                >
                  <Badge
                    className="mt-px shrink-0 font-normal"
                    variant="secondary"
                  >
                    {group.label}
                  </Badge>
                  <p className="text-sm leading-snug text-pretty">
                    {memory.content}
                  </p>
                </li>
              ))
            )}
          </ul>
        </Section>
      ) : null}
    </div>
  );
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

export function PersonaDetailDialog({
  open,
  onOpenChange,
  organizationId,
  persona,
}: PersonaDetailDialogProps) {
  const { data, isLoading, refetch } = useGeoPersonaResults(
    organizationId,
    open ? persona?.id : undefined
  );
  const startScan = useGeoStartScan(organizationId);
  const isScanning = useIsGeoScanning(organizationId);
  const wasScanning = useRef(isScanning);

  // A scan started from this dialog writes the conversation in the
  // background; pull it in once the scan ends instead of making the user
  // close and reopen the dialog.
  useEffect(() => {
    if (wasScanning.current && !isScanning && open) {
      void refetch();
    }
    wasScanning.current = isScanning;
  }, [isScanning, open, refetch]);
  const [view, setView] = useState<PersonaDialogView>(DEFAULT_VIEW);
  const [engine, setEngine] = useState<string | null>(null);
  const [playToken, setPlayToken] = useState(1);
  const [skipReplay, setSkipReplay] = useState(false);
  const reducedMotion = useReducedMotion();

  const threads = useMemo(
    () => toPersonaEngineThreads(data?.results ?? [], persona?.id),
    [data, persona]
  );
  const active =
    threads.find((thread) => thread.engine === engine) ?? threads[0] ?? null;
  const showConversation = view === "conversation";
  const progress = useAnswerReplay(
    showConversation && active ? active.turns : EMPTY_TURNS,
    playToken,
    Boolean(reducedMotion),
    skipReplay
  );
  const isReplaying = progress !== null;
  const latestCheck = latestCheckAt(threads);

  if (!persona) {
    return null;
  }

  return (
    <ResponsiveDialog onOpenChange={onOpenChange} open={open}>
      <ResponsiveDialogContent
        className="flex h-[min(calc(100vh-2rem),900px)] max-h-[calc(100vh-2rem)] w-full max-w-[min(calc(100vw-2rem),72rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[min(calc(100vw-2rem),72rem)]"
        drawerClassName="h-[94svh] max-h-[94svh]"
      >
        <ResponsiveDialogHeader className="shrink-0 gap-3 overflow-visible px-6 pt-5 pr-12 pb-3">
          <div className="flex items-center gap-3">
            <PersonaAvatar className="size-12" persona={persona} size="lg" />
            <div className="min-w-0 space-y-0.5">
              <ResponsiveDialogTitle className="text-xl leading-snug font-semibold text-balance">
                {persona.name}
              </ResponsiveDialogTitle>
              <ResponsiveDialogDescription className="text-muted-foreground text-sm">
                {persona.role} · {persona.company}
                {latestCheck
                  ? ` · ${formatAiTrafficTimestamp(latestCheck)}`
                  : null}
              </ResponsiveDialogDescription>
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
        </ResponsiveDialogHeader>

        <div className="relative min-h-0 flex-1 overflow-hidden border-t">
          {showConversation ? (
            <>
              {isLoading && (
                <div className="px-6 py-8">
                  <Skeleton className="h-40 w-full" />
                </div>
              )}
              {!isLoading && active && (
                <ConversationReplayThread
                  engine={active.engine}
                  key={active.engine}
                  progress={progress}
                  turns={active.turns}
                />
              )}
              {!(isLoading || active) && (
                <ConversationEmpty
                  enabled={persona.enabled}
                  isScanning={isScanning}
                  onRunScan={() => startScan.mutate("personas_empty")}
                />
              )}
            </>
          ) : (
            <div className="h-full overflow-y-auto">
              <PersonaProfile persona={persona} />
            </div>
          )}
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
