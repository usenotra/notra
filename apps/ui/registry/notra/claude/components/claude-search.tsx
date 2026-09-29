"use client";

import { cn } from "cn";
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CircleXIcon,
  ClockIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { Fragment, useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

import { Shimmer } from "../../shimmer/components/shimmer";
import { useClaudeReducedMotion } from "../hooks/use-claude-reduced-motion";
import { useClaudeSearchSequence } from "../hooks/use-claude-search-sequence";
import { claudeFaviconSrc, claudeStepSummary } from "../lib/claude-search";
import type {
  ClaudeSearchGroup,
  ClaudeSearchProps,
  ClaudeSearchStep,
  ClaudeSearchStepIcon,
  ClaudeStepItem,
  ClaudeStepTool,
} from "../types/claude";
import { ClaudeSpinner } from "./claude-spinner";

const EMPTY_STEPS: readonly ClaudeSearchStep[] = [];
const EMPTY_GROUPS: readonly ClaudeSearchGroup[] = [];
const EMPTY_ITEMS: readonly ClaudeStepItem[] = [];

const EASE = "ease-[cubic-bezier(0.22,1,0.36,1)]";

const ENTER_CLASS = cn(
  "translate-y-0 opacity-100 transition-[opacity,translate] duration-200 motion-reduce:transition-none starting:translate-y-1 starting:opacity-0",
  EASE
);

const TRIGGER_CLASS =
  "focus-visible:ring-claude-fg/20 h-auto min-w-0 justify-start rounded-md font-normal hover:bg-transparent focus-visible:border-transparent focus-visible:ring-2 active:not-aria-[haspopup]:translate-y-0 aria-expanded:bg-transparent dark:hover:bg-transparent";

const STEP_TEXT_CLASS: Record<ClaudeSearchStepIcon, string> = {
  check: "text-claude-muted",
  clock: "text-claude-muted",
  error: "text-claude-danger",
};

const STEP_ICON_CLASS = "size-3.5 shrink-0";

const defaultResultsLabel = () => "Results";

const ClaudeStepIcon = ({ icon }: { icon: ClaudeSearchStepIcon }) => {
  if (icon === "check") {
    return <CheckIcon className={STEP_ICON_CLASS} strokeWidth={1.5} />;
  }
  if (icon === "error") {
    return <CircleXIcon className={STEP_ICON_CLASS} strokeWidth={1.5} />;
  }
  return <ClockIcon className={STEP_ICON_CLASS} strokeWidth={1.5} />;
};

const ClaudeResultsPanel = ({
  count,
  resultsLabel,
  results,
}: {
  count: number;
  resultsLabel: (count: number) => ReactNode;
  results: NonNullable<ClaudeStepTool["results"]>;
}) => (
  <div className="bg-claude-card rounded-xl px-2.5 pt-2 pb-1.5">
    <p className="text-claude-muted px-0.5 pb-1 text-sm leading-5">
      {resultsLabel(count)}
    </p>
    <ItemGroup className="gap-0">
      {results.map((result) => (
        <Item
          className="h-7 flex-nowrap gap-2 rounded-none border-0 px-0.5 py-0 text-sm"
          key={`${result.domain}-${result.title}`}
          role="listitem"
        >
          <ItemMedia>
            <Avatar className="size-4 rounded-[0.1875rem] bg-white after:hidden">
              <AvatarImage
                alt=""
                className="rounded-[0.1875rem]"
                src={claudeFaviconSrc(result.domain)}
              />
              <AvatarFallback className="bg-claude-hover rounded-[0.1875rem]" />
            </Avatar>
          </ItemMedia>
          <ItemContent className="min-w-0">
            <ItemTitle className="text-claude-fg block w-full truncate text-sm leading-5 font-normal">
              {result.title}
            </ItemTitle>
          </ItemContent>
          <ItemActions className="text-claude-muted w-[36%] shrink-0">
            <span className="truncate text-sm leading-5">{result.domain}</span>
          </ItemActions>
        </Item>
      ))}
    </ItemGroup>
  </div>
);

const ClaudeCodeBlock = ({ code }: { code: string }) => (
  <ScrollArea className="bg-claude-card rounded-xl">
    <pre className="text-claude-text w-max min-w-full px-3 py-2.5 font-mono text-xs leading-5">
      {code}
    </pre>
    <ScrollBar orientation="horizontal" />
  </ScrollArea>
);

const ClaudeToolRow = ({
  resultsLabel,
  tool,
}: {
  resultsLabel: (count: number) => ReactNode;
  tool: ClaudeStepTool;
}) => {
  const labelNode = (
    <>
      <span className="text-claude-muted shrink-0">{tool.label}</span>
      {tool.detail && (
        <span className="text-claude-fg min-w-0 truncate">{tool.detail}</span>
      )}
    </>
  );
  const expandable = Boolean(tool.results || tool.code || tool.content);

  if (!expandable) {
    return (
      <p className="flex items-center gap-2 px-4 py-2.5 text-[0.9375rem] leading-6">
        {labelNode}
      </p>
    );
  }

  return (
    <Collapsible data-slot="claude-tool-row">
      <CollapsibleTrigger
        render={
          <Button
            className={cn(
              TRIGGER_CLASS,
              "group/claude-query w-full gap-2 rounded-none px-4 py-2.5 text-[0.9375rem] leading-6"
            )}
            type="button"
            variant="ghost"
          />
        }
      >
        {labelNode}
        <ChevronRightIcon
          className="text-claude-muted ms-auto size-3.5 shrink-0 transition-transform duration-200 group-data-panel-open/claude-query:rotate-90 motion-reduce:transition-none"
          strokeWidth={1.5}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="px-2 pb-2">
        {tool.results && (
          <ClaudeResultsPanel
            count={tool.count ?? tool.results.length}
            results={tool.results}
            resultsLabel={resultsLabel}
          />
        )}
        {tool.code && <ClaudeCodeBlock code={tool.code} />}
        {tool.content && (
          <div className="text-claude-text px-2 py-1 text-sm leading-6">
            {tool.content}
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
};

const ClaudeThoughtRow = ({ children }: { children: ReactNode }) => (
  <p className="text-claude-muted px-4 py-2.5 text-[0.9375rem] leading-6">
    {children}
  </p>
);

const ClaudeStatusRow = ({ step }: { step: ClaudeSearchStep }) => (
  <p
    className={cn(
      "flex items-center gap-2 px-4 py-2.5 text-[0.9375rem] leading-6",
      STEP_TEXT_CLASS[step.icon]
    )}
  >
    <ClaudeStepIcon icon={step.icon} />
    {step.label}
  </p>
);

interface ClaudeEntry {
  key: string;
  node: ReactNode;
  tool: boolean;
}

interface ClaudeEntriesInput {
  groups: readonly ClaudeSearchGroup[];
  items: readonly ClaudeStepItem[];
  queryLabel: ReactNode;
  resultsLabel: NonNullable<ClaudeSearchProps["resultsLabel"]>;
  steps: readonly ClaudeSearchStep[];
  thought: ReactNode;
}

const buildClaudeEntries = ({
  groups,
  items,
  queryLabel,
  resultsLabel,
  steps,
  thought,
}: ClaudeEntriesInput): ClaudeEntry[] => {
  const entries: { key: string; node: ReactNode; tool: boolean }[] = [];
  if (thought) {
    entries.push({
      key: "thought",
      node: <ClaudeThoughtRow>{thought}</ClaudeThoughtRow>,
      tool: false,
    });
  }
  for (const group of groups) {
    entries.push({
      key: `query-${group.query}`,
      node: (
        <ClaudeToolRow
          resultsLabel={resultsLabel}
          tool={{
            count: group.count,
            detail: group.query,
            label: queryLabel,
            results: group.results,
            type: "tool",
          }}
        />
      ),
      tool: true,
    });
  }
  for (const [index, item] of items.entries()) {
    entries.push({
      key: `item-${index}`,
      node:
        item.type === "thought" ? (
          <ClaudeThoughtRow>{item.text}</ClaudeThoughtRow>
        ) : (
          <ClaudeToolRow resultsLabel={resultsLabel} tool={item} />
        ),
      tool: item.type === "tool",
    });
  }
  for (const step of steps) {
    entries.push({
      key: `step-${step.label}`,
      node: <ClaudeStatusRow step={step} />,
      tool: false,
    });
  }

  return entries;
};

export const ClaudeSearch = ({
  className,
  defaultOpen = false,
  groups = EMPTY_GROUPS,
  items = EMPTY_ITEMS,
  onOpenChange,
  open: openProp,
  queryLabel = "Searched the web",
  reducedMotion,
  resultsLabel = defaultResultsLabel,
  sequential = false,
  steps = EMPTY_STEPS,
  summary,
  thought,
  verb = "Untangling",
  ...props
}: ClaudeSearchProps) => {
  const reduced = useClaudeReducedMotion(reducedMotion);
  const shouldSequence = sequential && !reduced;

  const entries = buildClaudeEntries({
    groups,
    items,
    queryLabel,
    resultsLabel,
    steps,
    thought,
  });

  const toolFlags = entries.map((entry) => entry.tool).join(",");
  const { done, visibleCount } = useClaudeSearchSequence(
    toolFlags,
    shouldSequence
  );
  const shown = shouldSequence ? visibleCount : entries.length;
  const finished = shouldSequence ? done : true;

  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const running = shouldSequence && !finished;
  const open = openProp ?? (running || uncontrolledOpen);
  const handleOpenChange: NonNullable<ClaudeSearchProps["onOpenChange"]> = (
    next,
    details
  ) => {
    setUncontrolledOpen(next);
    onOpenChange?.(next, details);
  };

  const autoSummary = claudeStepSummary(items, groups);
  const doneLabel = summary ?? (autoSummary || verb);

  return (
    <Collapsible
      aria-busy={!finished}
      className={cn("font-claude w-full", className)}
      data-slot="claude-search"
      onOpenChange={handleOpenChange}
      open={open}
      {...props}
    >
      <div className="flex items-center gap-3.5">
        {!finished && (
          <span className="flex w-4 shrink-0 items-center justify-center">
            <ClaudeSpinner
              animated
              aria-label="Searching"
              reducedMotion={reduced}
              size={16}
            />
          </span>
        )}
        <CollapsibleTrigger
          render={
            <Button
              className={cn(
                TRIGGER_CLASS,
                "group/claude-search-trigger text-claude-text hover:text-claude-fg aria-expanded:text-claude-text -mx-1 w-fit gap-1.5 px-1 py-0.5 font-sans text-base leading-6"
              )}
              type="button"
              variant="ghost"
            />
          }
        >
          {finished ? (
            doneLabel
          ) : (
            <Shimmer className="[--shimmer-highlight:var(--claude-fg)]">
              {verb}
            </Shimmer>
          )}
          <ChevronDownIcon
            className="text-claude-muted size-3.5"
            strokeWidth={1.5}
          />
        </CollapsibleTrigger>
      </div>

      {entries.length > 0 && (
        <CollapsibleContent className={cn("pt-2.5", !finished && "ps-7.5")}>
          <Card className="border-claude-card-border gap-0 rounded-[0.75rem] border bg-transparent py-0 text-[0.9375rem] ring-0">
            {entries.slice(0, shown).map((entry, index) => (
              <Fragment key={entry.key}>
                {index > 0 && (
                  <Separator className="bg-claude-card-divider h-px w-full" />
                )}
                <div className={shouldSequence ? ENTER_CLASS : undefined}>
                  {entry.node}
                </div>
              </Fragment>
            ))}
          </Card>
        </CollapsibleContent>
      )}
    </Collapsible>
  );
};
