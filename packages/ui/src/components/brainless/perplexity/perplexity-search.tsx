"use client";

import {
  ArrowDown01Icon,
  GlobalIcon,
  Search01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { PerplexityFavicon } from "@notra/ui/components/brainless/perplexity/perplexity-favicon";
import {
  PERPLEXITY_SEARCH_HEADER_MS,
  PERPLEXITY_SEARCH_QUERY_MS,
  PERPLEXITY_SEARCH_STAGGER_MS,
} from "@notra/ui/components/brainless/perplexity/perplexity-search-timing";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@notra/ui/components/ui/collapsible";
import { cn } from "@notra/ui/lib/utils";
import type {
  PerplexitySearchLabels,
  PerplexitySearchSource,
} from "@notra/ui/types/perplexity";
import type { CSSProperties } from "react";
import { useEffect, useState } from "react";

export type { PerplexitySearchSource } from "@notra/ui/types/perplexity";

function sourceHref(url: string | undefined): string | null {
  if (!url) {
    return null;
  }

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed.href;
  } catch {
    return null;
  }
}

function SourceCells({ source }: { source: PerplexitySearchSource }) {
  return (
    <>
      <PerplexityFavicon className="size-4" domain={source.domain} />
      <p className="min-w-0 truncate text-[13.5px] leading-5 text-[#6b6b6b] dark:text-[#b3b3b3]">
        {source.title}
      </p>
      <span className="flex shrink-0 items-center gap-1 text-[12px] leading-none text-[#8d8d8d]">
        <span className="max-w-[7.5rem] truncate">
          {source.domain.replace(/^www\./, "")}
        </span>
        {source.verified === false ? null : (
          <ShieldMark className="size-3 text-[#8d8d8d]" />
        )}
      </span>
    </>
  );
}

function SourceRow({
  source,
  className,
  style,
}: {
  source: PerplexitySearchSource;
  className?: string;
  style?: CSSProperties;
}) {
  const href = sourceHref(source.url);
  const rowClassName =
    "grid grid-cols-[1rem_minmax(0,1fr)_auto] items-center gap-2.5";

  return (
    <li className={className} style={style}>
      {href ? (
        <a
          className={cn(
            rowClassName,
            "rounded-sm outline-none transition-colors hover:text-[#1a1a1a] focus-visible:ring-2 focus-visible:ring-black/15 dark:hover:text-foreground"
          )}
          href={href}
          rel="noopener noreferrer"
          target="_blank"
        >
          <SourceCells source={source} />
        </a>
      ) : (
        <div className={rowClassName}>
          <SourceCells source={source} />
        </div>
      )}
    </li>
  );
}

function ShieldMark({ className }: { className?: string }) {
  return (
    <svg aria-hidden className={className} fill="none" viewBox="0 0 12 12">
      <path
        d="M6 1.15 10.2 2.7v3.05c0 2.28-1.72 3.86-4.2 4.95-2.48-1.09-4.2-2.67-4.2-4.95V2.7L6 1.15Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.15"
      />
      <path
        d="M4.15 6.05 5.35 7.2 7.9 4.55"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.15"
      />
    </svg>
  );
}

const ENTER_CLASS =
  "translate-y-0 opacity-100 transition-[opacity,transform] duration-normal ease-emphasized starting:translate-y-1.5 starting:opacity-0 motion-reduce:transition-none motion-reduce:starting:translate-y-0 motion-reduce:starting:opacity-100";

const PANEL_CLASS =
  "grid overflow-hidden outline-none transition-[grid-template-rows,opacity] duration-slow ease-emphasized data-closed:grid-rows-[0fr] data-open:grid-rows-[1fr] data-[ending-style]:grid-rows-[0fr] data-[ending-style]:opacity-0 data-[starting-style]:grid-rows-[0fr] data-[starting-style]:opacity-0 motion-reduce:transition-none";

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

const DEFAULT_PREVIEW_COUNT = 4;

export function PerplexitySearch({
  title,
  queries,
  sources,
  extraCount,
  previewCount = DEFAULT_PREVIEW_COUNT,
  sequential = false,
  reducedMotion = false,
  emptyDescription,
  className,
  labels,
}: {
  title: string;
  queries: readonly string[];
  sources: readonly PerplexitySearchSource[];
  extraCount?: number;
  previewCount?: number;
  sequential?: boolean;
  reducedMotion?: boolean;
  emptyDescription?: string;
  className?: string;
  labels?: PerplexitySearchLabels;
}) {
  const shouldSequence = sequential && !reducedMotion;
  const visiblePreviewCount = Math.min(
    Math.max(previewCount, 0),
    sources.length
  );
  const previewSources = sources.slice(0, visiblePreviewCount);
  const extraSources = sources.slice(visiblePreviewCount);
  const hiddenCount = extraSources.length || extraCount || 0;
  const [open, setOpen] = useState(true);
  const [extrasOpen, setExtrasOpen] = useState(false);
  const [progress, setProgress] = useState({
    queries: 0,
    sources: false,
    done: false,
  });

  const visibleQueryCount = shouldSequence ? progress.queries : queries.length;
  const showSources = shouldSequence ? progress.sources : sources.length > 0;
  const finished = shouldSequence ? progress.done : true;

  useEffect(() => {
    if (!shouldSequence) {
      return;
    }

    let cancelled = false;

    async function run() {
      await wait(PERPLEXITY_SEARCH_HEADER_MS);
      if (cancelled) {
        return;
      }

      for (let index = 0; index < queries.length; index += 1) {
        if (cancelled) {
          return;
        }
        setProgress((current) => ({ ...current, queries: index + 1 }));
        await wait(PERPLEXITY_SEARCH_QUERY_MS);
      }

      if (cancelled) {
        return;
      }
      setProgress((current) => ({ ...current, sources: true }));
      await wait(previewSources.length * PERPLEXITY_SEARCH_STAGGER_MS + 180);
      if (!cancelled) {
        setProgress((current) => ({ ...current, done: true }));
      }
    }

    run().catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [shouldSequence, queries, previewSources.length]);

  const visibleQueries = queries.slice(0, visibleQueryCount);
  const hasBody =
    queries.length > 0 || sources.length > 0 || Boolean(emptyDescription);

  const header = (
    <>
      <span className="relative flex size-4 shrink-0 items-center justify-center">
        <HugeiconsIcon
          className={cn(
            "text-[#6b6b6b] dark:text-[#a3a3a3]",
            !finished && "animate-pulse"
          )}
          icon={GlobalIcon}
          size={15}
          strokeWidth={1.7}
        />
      </span>
      <span className="min-w-0 flex-1 truncate text-[14px] leading-5 text-[#5c5c5c] dark:text-[#b3b3b3]">
        {title}
      </span>
    </>
  );

  if (!hasBody) {
    return (
      <div className={cn("w-full max-w-[42rem] font-sans", className)}>
        <div className="flex w-full items-center gap-2 py-0.5">
          {header}
        </div>
      </div>
    );
  }

  return (
    <Collapsible
      className={cn("w-full max-w-[42rem] font-sans", className)}
      onOpenChange={setOpen}
      open={open}
    >
      <CollapsibleTrigger className="group/search flex w-full items-center gap-2 rounded-md py-0.5 text-left outline-none transition-colors hover:text-[#1a1a1a] focus-visible:ring-2 focus-visible:ring-black/15 dark:hover:text-foreground">
        {header}
        <HugeiconsIcon
          className="shrink-0 text-[#8d8d8d] transition-transform duration-slow ease-emphasized group-data-panel-open/search:rotate-180 motion-reduce:transition-none"
          icon={ArrowDown01Icon}
          size={14}
          strokeWidth={2}
        />
      </CollapsibleTrigger>

      <CollapsibleContent className={PANEL_CLASS} keepMounted>
        <div className="min-h-0 overflow-hidden">
          <div className="flex flex-col gap-2.5 pt-2">
          {visibleQueries.map((query) => (
            <div
              className={cn(
                "flex items-start gap-2.5 text-[13.5px] leading-5 text-[#6b6b6b] dark:text-[#a8a8a8]",
                shouldSequence && ENTER_CLASS
              )}
              key={query}
            >
              <HugeiconsIcon
                className="mt-0.5 shrink-0 text-[#8d8d8d]"
                icon={Search01Icon}
                size={14}
                strokeWidth={1.75}
              />
              <p className="min-w-0">{query}</p>
            </div>
          ))}

          {showSources ? (
            <div className="mt-1">
              <ul className="flex flex-col gap-2.5">
                {previewSources.map((source, index) => (
                  <SourceRow
                    className={shouldSequence ? ENTER_CLASS : undefined}
                    key={`${source.domain}-${source.title}`}
                    source={source}
                    style={
                      shouldSequence
                        ? {
                            transitionDelay: `${index * PERPLEXITY_SEARCH_STAGGER_MS}ms`,
                          }
                        : undefined
                    }
                  />
                ))}
              </ul>
              {hiddenCount > 0 && extraSources.length > 0 ? (
                <Collapsible
                  onOpenChange={setExtrasOpen}
                  open={extrasOpen}
                >
                  <CollapsibleContent className={PANEL_CLASS} keepMounted>
                    <ul className="flex min-h-0 flex-col gap-2.5 overflow-hidden pt-2.5">
                      {extraSources.map((source) => (
                        <SourceRow
                          key={`${source.domain}-${source.title}`}
                          source={source}
                        />
                      ))}
                    </ul>
                  </CollapsibleContent>
                  <CollapsibleTrigger
                    className={cn(
                      "mt-0.5 cursor-pointer ps-[1.625rem] text-left text-[13px] leading-5 text-[#8d8d8d] outline-none transition-colors hover:text-[#5c5c5c] focus-visible:ring-2 focus-visible:ring-black/15 dark:hover:text-[#c4c4c4]",
                      shouldSequence && ENTER_CLASS
                    )}
                    onClick={(event) => {
                      event.stopPropagation();
                    }}
                  >
                    {extrasOpen
                      ? (labels?.showLess ?? "Show less")
                      : (labels?.more(hiddenCount) ?? `+${hiddenCount} more`)}
                  </CollapsibleTrigger>
                </Collapsible>
              ) : hiddenCount > 0 ? (
                <p
                  className={cn(
                    "mt-0.5 ps-[1.625rem] text-[13px] leading-5 text-[#8d8d8d]",
                    shouldSequence && ENTER_CLASS
                  )}
                >
                  {labels?.more(hiddenCount) ?? `+${hiddenCount} more`}
                </p>
              ) : null}
            </div>
          ) : emptyDescription ? (
            <p className="text-[13.5px] leading-5 text-[#8d8d8d]">
              {emptyDescription}
            </p>
          ) : null}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
