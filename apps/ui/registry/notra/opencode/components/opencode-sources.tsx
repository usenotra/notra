"use client";

import { cn } from "cn";
import type { CSSProperties } from "react";

import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Item,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@/components/ui/item";

import { OPENCODE_SEARCH_STAGGER_MS } from "../constants/opencode";
import { useOpencodeReducedMotion } from "../hooks/use-opencode-reduced-motion";
import { useOpencodeSourcesSequence } from "../hooks/use-opencode-sources-sequence";
import type {
  OpencodeSource,
  OpencodeSourcesLabels,
  OpencodeSourcesProps,
} from "../types/opencode";
import { OpencodeActivity } from "./opencode-activity";

const MARKDOWN_URL_AFFIX_PATTERN = /\)\*+$/u;
const EMPTY_QUERIES: readonly string[] = [];

const ENTER_CLASS =
  "translate-y-0 opacity-100 transition-[opacity,translate] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] starting:translate-y-1 starting:opacity-0 motion-reduce:transition-none motion-reduce:starting:translate-y-0 motion-reduce:starting:opacity-100";

const ROW_CLASS =
  "text-opencode-fg focus-visible:ring-opencode-purple/60 grid grid-cols-[minmax(0,20ch)_minmax(0,1fr)] items-baseline gap-[2ch] rounded-sm border-0 p-0 text-[0.8125rem] leading-[1.3] focus-visible:border-transparent focus-visible:ring-1 [a]:hover:bg-transparent";

const CELL_CLASS =
  "block w-auto min-w-0 truncate text-[length:inherit] leading-[inherit] font-normal";

const DEFAULT_LABELS: OpencodeSourcesLabels = {
  citedSources: (count) =>
    count === 1 ? "1 cited source" : `${count} cited sources`,
  openSource: (title, domain) => `Open ${title} on ${domain}`,
};

const citedSourceUrl = (url: string) =>
  url.replace(MARKDOWN_URL_AFFIX_PATTERN, "");

const sourceHref = (url: string | undefined) => {
  if (!url) {
    return null;
  }
  try {
    const parsed = new URL(citedSourceUrl(url));
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed.href;
  } catch {
    return null;
  }
};

const OpencodeSourceRow = ({
  className,
  delayMs,
  openLabel,
  source,
}: {
  className?: string;
  delayMs?: number;
  openLabel: OpencodeSourcesLabels["openSource"];
  source: OpencodeSource;
}) => {
  const href = sourceHref(source.url);
  const urlLabel = source.url ? citedSourceUrl(source.url) : source.title;

  return (
    <Item
      aria-label={href ? openLabel(source.title, source.domain) : undefined}
      className={cn(
        ROW_CLASS,
        delayMs !== undefined && "delay-(--opencode-delay)",
        className
      )}
      render={
        href
          ? (linkProps) => (
              <a
                {...linkProps}
                href={href}
                rel="noopener noreferrer"
                target="_blank"
              >
                {linkProps.children}
              </a>
            )
          : undefined
      }
      role="listitem"
      style={
        delayMs === undefined
          ? undefined
          : ({ "--opencode-delay": `${delayMs}ms` } as CSSProperties)
      }
    >
      <ItemTitle className={CELL_CLASS}>{source.domain}</ItemTitle>
      <ItemDescription className={cn(CELL_CLASS, "text-opencode-muted")}>
        {urlLabel}
      </ItemDescription>
    </Item>
  );
};

export const OpencodeSources = ({
  className,
  defaultOpen = false,
  labels = DEFAULT_LABELS,
  queries = EMPTY_QUERIES,
  reducedMotion,
  sequential = false,
  sources,
  ...props
}: OpencodeSourcesProps) => {
  const reduced = useOpencodeReducedMotion(reducedMotion);
  const shouldSequence = sequential && !reduced;
  const progress = useOpencodeSourcesSequence(
    shouldSequence,
    queries.length,
    sources.length
  );

  const visibleQueryCount = shouldSequence ? progress.queries : queries.length;
  const showSources = shouldSequence ? progress.sources : sources.length > 0;

  if (sources.length === 0 && queries.length === 0) {
    return null;
  }

  const visibleQueries = queries.slice(0, visibleQueryCount);
  const enterClass = shouldSequence ? ENTER_CLASS : undefined;

  return (
    <Collapsible
      aria-live={shouldSequence ? "polite" : undefined}
      className={cn("font-opencode flex w-full flex-col gap-0", className)}
      data-slot="opencode-sources"
      defaultOpen={defaultOpen}
      {...props}
    >
      {visibleQueries.map((query) => (
        <OpencodeActivity
          className={enterClass}
          detail={`query=${query}`}
          key={query}
          kind="tool"
          label="websearch"
        />
      ))}
      {showSources && (
        <div className="flex flex-col gap-0">
          <CollapsibleTrigger
            render={
              <Button
                className={cn(
                  "group/opencode-sources text-opencode-muted hover:text-opencode-fg aria-expanded:text-opencode-muted focus-visible:ring-opencode-purple/60 h-auto w-fit justify-start gap-[1ch] rounded-xs p-0 text-[0.8125rem] leading-[1.3] font-normal hover:bg-transparent focus-visible:border-transparent focus-visible:ring-1 active:not-aria-[haspopup]:translate-y-0 aria-expanded:bg-transparent dark:hover:bg-transparent",
                  enterClass
                )}
                variant="ghost"
              />
            }
          >
            {labels.citedSources(sources.length)}
            <span
              aria-hidden="true"
              className="inline-block text-[0.625rem] transition-transform duration-150 group-data-panel-open/opencode-sources:rotate-90 motion-reduce:transition-none"
            >
              ▶
            </span>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ItemGroup className="gap-0">
              {sources.map((source, index) => (
                <OpencodeSourceRow
                  className={enterClass}
                  delayMs={
                    shouldSequence
                      ? (index + 1) * OPENCODE_SEARCH_STAGGER_MS
                      : undefined
                  }
                  key={source.url ?? `${source.domain}-${source.title}`}
                  openLabel={labels.openSource}
                  source={source}
                />
              ))}
            </ItemGroup>
          </CollapsibleContent>
        </div>
      )}
    </Collapsible>
  );
};
