"use client";

import { OpencodeActivity } from "@notra/ui/components/ai-skins/opencode/opencode-activity";
import {
  OPENCODE_SEARCH_HEADER_MS,
  OPENCODE_SEARCH_QUERY_MS,
  OPENCODE_SEARCH_SOURCES_MS,
  OPENCODE_SEARCH_STAGGER_MS,
} from "@notra/ui/constants/opencode-skin";
import { cn } from "@notra/ui/lib/utils";
import type {
  OpencodeSource,
  OpencodeSourcesLabels,
  OpencodeSourcesProps,
} from "@notra/ui/types/opencode-skin";
import type { CSSProperties } from "react";
import { useEffect, useState } from "react";

const TRAILING_MARKDOWN_PATTERN = /\)\*+$/u;
const NO_QUERIES: readonly string[] = [];
const HIDDEN = { queries: 0, sources: false };

const REVEAL_CLASS =
  "opacity-100 transition-opacity duration-200 ease-out delay-(--opencode-delay) starting:opacity-0 motion-reduce:transition-none";

const DEFAULT_LABELS: OpencodeSourcesLabels = {
  citedSources: (count) =>
    count === 1 ? "1 cited source" : `${count} cited sources`,
  openSource: (title, domain) => `Open ${title} on ${domain}`,
};

function cleanUrl(url: string): string {
  return url.replace(TRAILING_MARKDOWN_PATTERN, "");
}

function safeHref(url: string | undefined): string | null {
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
}

function useRevealSequence(
  enabled: boolean,
  queryCount: number,
  sourceCount: number
) {
  const [sequence, setSequence] = useState(HIDDEN);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    const timers: number[] = [];
    const schedule = (at: number, next: Partial<typeof HIDDEN>) => {
      timers.push(
        window.setTimeout(() => {
          setSequence((current) => ({ ...current, ...next }));
        }, at)
      );
    };

    let at = OPENCODE_SEARCH_HEADER_MS;
    for (let shown = 1; shown <= queryCount; shown += 1) {
      schedule(at, { queries: shown });
      at += OPENCODE_SEARCH_QUERY_MS;
    }
    if (sourceCount > 0) {
      schedule(at + OPENCODE_SEARCH_SOURCES_MS, { sources: true });
    }

    return () => {
      for (const timer of timers) {
        window.clearTimeout(timer);
      }
      setSequence(HIDDEN);
    };
  }, [enabled, queryCount, sourceCount]);

  return sequence;
}

function SourceLine({
  source,
  delayMs,
  openLabel,
}: {
  source: OpencodeSource;
  delayMs?: number;
  openLabel: OpencodeSourcesLabels["openSource"];
}) {
  const href = safeHref(source.url);
  const content = (
    <>
      <span className="truncate text-opencode-tui-foreground">
        {source.domain}
      </span>
      <span className="truncate text-opencode-tui-muted">
        {source.url ? cleanUrl(source.url) : source.title}
      </span>
    </>
  );

  return (
    <li
      className={cn(
        "grid grid-cols-[minmax(0,18ch)_minmax(0,1fr)] gap-[2ch]",
        delayMs !== undefined && REVEAL_CLASS
      )}
      style={
        delayMs === undefined
          ? undefined
          : ({ "--opencode-delay": `${delayMs}ms` } as CSSProperties)
      }
    >
      {href ? (
        <a
          aria-label={openLabel(source.title, source.domain)}
          className="col-span-2 grid grid-cols-subgrid outline-none hover:underline focus-visible:ring-1 focus-visible:ring-opencode-tui-blue"
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
}

export function OpencodeSources({
  sources,
  darkSurface = false,
  queries = NO_QUERIES,
  sequential = false,
  reducedMotion = false,
  className,
  labels = DEFAULT_LABELS,
}: OpencodeSourcesProps) {
  const staged = sequential && !reducedMotion;
  const progress = useRevealSequence(staged, queries.length, sources.length);

  if (sources.length === 0 && queries.length === 0) {
    return null;
  }

  const shownQueries = staged ? queries.slice(0, progress.queries) : queries;
  const showSources = staged ? progress.sources : sources.length > 0;
  const indent = darkSurface ? "pl-0" : "pl-[3ch]";

  return (
    <div
      aria-live={staged ? "polite" : undefined}
      className={cn(
        "flex w-full min-w-0 flex-col font-mono text-[13px] leading-5",
        className
      )}
    >
      {shownQueries.map((query) => (
        <OpencodeActivity
          className={cn(indent, staged && REVEAL_CLASS)}
          detail={`"${query}"`}
          key={query}
          kind="search"
        />
      ))}
      {showSources ? (
        <div className={cn(indent, staged && REVEAL_CLASS)}>
          <p className="pl-[2ch] text-opencode-tui-muted">
            {labels.citedSources(sources.length)}
          </p>
          <ul className="pl-[4ch]">
            {sources.map((source, index) => (
              <SourceLine
                delayMs={
                  staged ? (index + 1) * OPENCODE_SEARCH_STAGGER_MS : undefined
                }
                key={source.url ?? `${source.domain}-${source.title}`}
                openLabel={labels.openSource}
                source={source}
              />
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
