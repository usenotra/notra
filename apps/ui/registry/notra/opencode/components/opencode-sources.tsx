"use client";

import { cn } from "cn";
import type { CSSProperties } from "react";

import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

import { OPENCODE_SEARCH_STAGGER_MS } from "../constants/opencode";
import { useOpencodeReducedMotion } from "../hooks/use-opencode-reduced-motion";
import { useOpencodeSourcesSequence } from "../hooks/use-opencode-sources-sequence";
import type {
  OpencodeSource,
  OpencodeSourcesLabels,
  OpencodeSourcesProps,
} from "../types/opencode";
import { OpencodeActivity } from "./opencode-activity";

const TRAILING_MARKDOWN_PATTERN = /\)\*+$/u;
const NO_QUERIES: readonly string[] = [];

const REVEAL_CLASS =
  "opacity-100 transition-opacity duration-200 ease-out delay-(--opencode-delay) starting:opacity-0 motion-reduce:transition-none";

const DEFAULT_LABELS: OpencodeSourcesLabels = {
  citedSources: (count) =>
    count === 1 ? "1 cited source" : `${count} cited sources`,
  openSource: (title, domain) => `Open ${title} on ${domain}`,
};

const cleanUrl = (url: string) => url.replace(TRAILING_MARKDOWN_PATTERN, "");

const safeHref = (url: string | undefined) => {
  if (!url) {
    return null;
  }
  try {
    const parsed = new URL(cleanUrl(url));
    return parsed.protocol === "http:" || parsed.protocol === "https:"
      ? parsed.href
      : null;
  } catch {
    return null;
  }
};

const SourceLine = ({
  delayMs,
  openLabel,
  source,
}: {
  delayMs?: number;
  openLabel: OpencodeSourcesLabels["openSource"];
  source: OpencodeSource;
}) => {
  const href = safeHref(source.url);
  const style =
    delayMs === undefined
      ? undefined
      : ({ "--opencode-delay": `${delayMs}ms` } as CSSProperties);
  const content = (
    <>
      <span className="text-opencode-fg truncate">{source.domain}</span>
      <span className="text-opencode-muted truncate">
        {source.url ? cleanUrl(source.url) : source.title}
      </span>
    </>
  );
  const lineClass = cn(
    "grid grid-cols-[minmax(0,18ch)_minmax(0,1fr)] gap-[2ch]",
    delayMs !== undefined && REVEAL_CLASS
  );

  return (
    <li className={lineClass} style={style}>
      {href ? (
        <a
          aria-label={openLabel(source.title, source.domain)}
          className="focus-visible:ring-opencode-blue col-span-2 grid grid-cols-subgrid outline-none hover:underline focus-visible:ring-1"
          href={href}
          rel="noopener noreferrer"
          target="_blank"
        >
          {content}
        </a>
      ) : (
        content
      )}
    </li>
  );
};

export const OpencodeSources = ({
  className,
  defaultOpen = false,
  labels = DEFAULT_LABELS,
  queries = NO_QUERIES,
  reducedMotion,
  sequential = false,
  sources,
  ...props
}: OpencodeSourcesProps) => {
  const reduced = useOpencodeReducedMotion(reducedMotion);
  const staged = sequential && !reduced;
  const progress = useOpencodeSourcesSequence(
    staged,
    queries.length,
    sources.length
  );

  if (sources.length === 0 && queries.length === 0) {
    return null;
  }

  const shownQueries = staged ? queries.slice(0, progress.queries) : queries;
  const showSources = staged ? progress.sources : sources.length > 0;

  return (
    <Collapsible
      aria-live={staged ? "polite" : undefined}
      className={cn("flex w-full min-w-0 flex-col", className)}
      data-slot="opencode-sources"
      defaultOpen={defaultOpen}
      {...props}
    >
      {shownQueries.map((query) => (
        <OpencodeActivity
          className={cn(staged && REVEAL_CLASS)}
          detail={`"${query}"`}
          key={query}
          kind="search"
        />
      ))}
      {showSources && (
        <div className={cn("ps-[5ch]", staged && REVEAL_CLASS)}>
          <CollapsibleTrigger
            render={
              <Button
                className="group/sources text-opencode-muted hover:text-opencode-fg aria-expanded:text-opencode-muted focus-visible:ring-opencode-blue h-auto gap-[1ch] rounded-none p-0 text-[length:inherit] leading-[inherit] font-normal hover:bg-transparent focus-visible:border-transparent focus-visible:ring-1 active:not-aria-[haspopup]:translate-y-0 aria-expanded:bg-transparent dark:hover:bg-transparent"
                variant="ghost"
              />
            }
          >
            <span
              aria-hidden="true"
              className="inline-block w-[1ch] text-[0.75em] transition-transform duration-150 group-aria-expanded/sources:rotate-90 motion-reduce:transition-none"
            >
              ▶
            </span>
            {labels.citedSources(sources.length)}
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ul className="ps-[2ch]">
              {sources.map((source, index) => (
                <SourceLine
                  delayMs={
                    staged
                      ? (index + 1) * OPENCODE_SEARCH_STAGGER_MS
                      : undefined
                  }
                  key={source.url ?? `${source.domain}-${source.title}`}
                  openLabel={labels.openSource}
                  source={source}
                />
              ))}
            </ul>
          </CollapsibleContent>
        </div>
      )}
    </Collapsible>
  );
};
