"use client";

import { OpencodeActivity } from "@notra/ui/components/brainless/opencode/opencode-activity";
import {
  OPENCODE_COLORS,
  OPENCODE_DARK_SOURCE_COLORS,
  OPENCODE_SEARCH_HEADER_MS,
  OPENCODE_SEARCH_QUERY_MS,
  OPENCODE_SEARCH_SOURCES_MS,
  OPENCODE_SEARCH_STAGGER_MS,
} from "@notra/ui/constants/brainless-opencode";
import { cn } from "@notra/ui/lib/utils";
import type {
  OpencodeSource,
  OpencodeSourcesProps,
} from "@notra/ui/types/brainless-opencode";
import type { CSSProperties } from "react";
import { useEffect, useState } from "react";

const MARKDOWN_URL_AFFIX_PATTERN = /\)\*+$/u;
const EMPTY_QUERIES: readonly string[] = [];

const ENTER_CLASS =
  "translate-y-0 opacity-100 transition-[opacity,transform] duration-slow ease-emphasized starting:translate-y-1 starting:opacity-0 motion-reduce:transition-none motion-reduce:starting:translate-y-0 motion-reduce:starting:opacity-100";

function citedSourceUrl(url: string): string {
  return url.replace(MARKDOWN_URL_AFFIX_PATTERN, "");
}

function sourceHref(url: string | undefined): string | null {
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
}

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function SourceRow({
  source,
  className,
  style,
}: {
  source: OpencodeSource;
  className?: string;
  style?: CSSProperties;
}) {
  const href = sourceHref(source.url);
  const urlLabel = source.url ? citedSourceUrl(source.url) : source.title;
  const row = (
    <>
      <span
        className="min-w-0 truncate"
        style={{ color: "var(--opencode-source-foreground)" }}
      >
        {source.domain}
      </span>
      <span
        className="min-w-0 truncate"
        style={{ color: "var(--opencode-source-muted)" }}
      >
        {urlLabel}
      </span>
    </>
  );

  return (
    <li className={className} style={style}>
      {href ? (
        <a
          aria-label={`Open ${source.title} on ${source.domain}`}
          className="grid grid-cols-[minmax(0,9.5rem)_minmax(0,1fr)] items-baseline gap-3 rounded-sm text-[12px] leading-5 outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--opencode-purple)]/60"
          href={href}
          rel="noopener noreferrer"
          style={
            {
              color: "var(--opencode-source-foreground)",
              "--opencode-purple": "var(--opencode-source-accent)",
            } as CSSProperties
          }
          target="_blank"
        >
          {row}
        </a>
      ) : (
        <p className="grid grid-cols-[minmax(0,9.5rem)_minmax(0,1fr)] items-baseline gap-3 text-[12px] leading-5">
          {row}
        </p>
      )}
    </li>
  );
}

export function OpencodeSources({
  sources,
  darkSurface = false,
  queries = EMPTY_QUERIES,
  sequential = false,
  reducedMotion = false,
  className,
}: OpencodeSourcesProps) {
  const colors = darkSurface ? OPENCODE_DARK_SOURCE_COLORS : OPENCODE_COLORS;
  const shouldSequence = sequential && !reducedMotion;
  const [progress, setProgress] = useState({
    queries: 0,
    sources: false,
  });

  const visibleQueryCount = shouldSequence ? progress.queries : queries.length;
  const showSources = shouldSequence ? progress.sources : sources.length > 0;

  useEffect(() => {
    if (!shouldSequence) {
      return;
    }

    let cancelled = false;
    setProgress({ queries: 0, sources: false });

    async function run() {
      await wait(OPENCODE_SEARCH_HEADER_MS);
      if (cancelled) {
        return;
      }

      for (let index = 0; index < queries.length; index += 1) {
        if (cancelled) {
          return;
        }
        setProgress((current) => ({ ...current, queries: index + 1 }));
        await wait(OPENCODE_SEARCH_QUERY_MS);
      }

      if (cancelled || sources.length === 0) {
        return;
      }

      await wait(OPENCODE_SEARCH_SOURCES_MS);
      if (!cancelled) {
        setProgress((current) => ({ ...current, sources: true }));
      }
    }

    run().catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [shouldSequence, queries, sources.length]);

  if (sources.length === 0 && queries.length === 0) {
    return null;
  }

  const countLabel =
    sources.length === 1 ? "1 cited source" : `${sources.length} cited sources`;
  const visibleQueries = queries.slice(0, visibleQueryCount);

  return (
    <div
      className={cn("flex w-full flex-col gap-2 font-mono", className)}
      style={{
        "--opencode-source-foreground": colors.foreground,
        "--opencode-source-muted": colors.muted,
        "--opencode-source-accent": colors.purple,
      } as CSSProperties}
    >
      {visibleQueries.map((query) => (
        <OpencodeActivity
          className={shouldSequence ? ENTER_CLASS : undefined}
          detail={`query=${query}`}
          key={query}
          kind="tool"
          label="websearch"
        />
      ))}
      {showSources ? (
        <div className="flex flex-col gap-1.5">
          <p
            className={cn(
              "text-[12px] leading-5",
              shouldSequence && ENTER_CLASS
            )}
            style={{ color: "var(--opencode-source-muted)" }}
          >
            {countLabel}
          </p>
          <ul className="flex flex-col gap-1">
            {sources.map((source, index) => (
              <SourceRow
                className={shouldSequence ? ENTER_CLASS : undefined}
                key={source.url ?? `${source.domain}-${source.title}`}
                source={source}
                style={
                  shouldSequence
                    ? {
                        transitionDelay: `${(index + 1) * OPENCODE_SEARCH_STAGGER_MS}ms`,
                      }
                    : undefined
                }
              />
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
