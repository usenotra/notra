"use client";

import { cn } from "cn";
import { ChevronDown, Search } from "lucide-react";
import { useEffect, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Empty, EmptyDescription } from "@/components/ui/empty";
import {
  Item,
  ItemContent,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { Separator } from "@/components/ui/separator";

import { Shimmer } from "../../shimmer/components/shimmer";
import {
  PERPLEXITY_SEARCH_HEADER_MS,
  PERPLEXITY_SEARCH_PREVIEW_COUNT,
  PERPLEXITY_SEARCH_QUERY_MS,
  PERPLEXITY_SEARCH_SETTLE_MS,
  PERPLEXITY_SEARCH_SOURCES_MS,
  PERPLEXITY_SEARCH_STAGGER_MS,
} from "../constants/perplexity";
import type {
  PerplexitySearchProps,
  PerplexitySource,
} from "../types/perplexity";
import { PerplexityFavicon } from "./perplexity-favicon";
import {
  PerplexityShieldIcon,
  PerplexityWebSearchIcon,
} from "./perplexity-icons";

const WWW_PREFIX = /^www\./;
const TLD_SUFFIX = /\.[^.]+$/;

const EASE = "ease-[cubic-bezier(0.22,1,0.36,1)]";

const ENTER_CLASS = `translate-y-0 opacity-100 transition-[opacity,translate] duration-200 ${EASE} motion-reduce:transition-none starting:translate-y-1.5 starting:opacity-0 motion-reduce:starting:translate-y-0 motion-reduce:starting:opacity-100`;

const PANEL_CLASS = `grid overflow-hidden transition-[grid-template-rows,opacity] duration-300 ${EASE} outline-none data-closed:grid-rows-[0fr] data-ending-style:grid-rows-[0fr] data-ending-style:opacity-0 data-open:grid-rows-[1fr] data-starting-style:grid-rows-[0fr] data-starting-style:opacity-0 motion-reduce:transition-none`;

const TRIGGER_CLASS =
  "focus-visible:ring-pplx-ring h-auto w-fit max-w-full justify-start gap-1.5 rounded-md border-0 p-0 text-left text-sm leading-5 font-normal whitespace-normal hover:bg-transparent focus-visible:border-transparent focus-visible:ring-2 active:not-aria-[haspopup]:translate-y-0 aria-expanded:bg-transparent dark:hover:bg-transparent dark:aria-expanded:bg-transparent";

const CHEVRON_CLASS = `text-pplx-muted size-3.5 shrink-0 transition-transform duration-300 ${EASE} motion-reduce:transition-none`;

const ROW_CLASS =
  "flex-nowrap items-center gap-2 rounded-sm border-0 p-0 text-sm leading-5";

const ROW_LINK_CLASS =
  "focus-visible:ring-pplx-ring [a]:hover:bg-transparent focus-visible:ring-2 [&:hover_[data-slot=item-title]]:text-pplx-fg";

const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });

const sourceHref = (url: string | undefined) => {
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
};

export const perplexityShortDomain = (domain: string) => {
  const host = domain.replace(WWW_PREFIX, "");
  const short = host.replace(TLD_SUFFIX, "");
  return short || host;
};

const SourceRow = ({
  className,
  source,
  style,
}: {
  className?: string;
  source: PerplexitySource;
  style?: CSSProperties;
}) => {
  const href = sourceHref(source.url);

  return (
    <Item
      className={cn(ROW_CLASS, href && ROW_LINK_CLASS, className)}
      render={
        href ? (
          // oxlint-disable-next-line jsx-a11y/anchor-has-content -- Item renders its children into the link
          <a href={href} rel="noopener noreferrer" target="_blank" />
        ) : undefined
      }
      role="listitem"
      style={style}
    >
      <ItemMedia>
        <PerplexityFavicon domain={source.domain} />
      </ItemMedia>
      <ItemContent className="min-w-0 flex-row items-center gap-2">
        <ItemTitle className="text-pplx-muted line-clamp-none block w-auto min-w-0 truncate text-sm leading-5 font-normal transition-colors">
          {source.title}
        </ItemTitle>
        <span className="text-pplx-subtle flex shrink-0 items-center gap-1 text-sm leading-5">
          <span className="max-w-36 truncate">
            {perplexityShortDomain(source.domain)}
          </span>
          {source.verified === false ? null : (
            <PerplexityShieldIcon className="size-3" />
          )}
        </span>
      </ItemContent>
    </Item>
  );
};

interface SearchProgress {
  done: boolean;
  queries: number;
  sources: boolean;
}

const INITIAL_PROGRESS: SearchProgress = {
  done: false,
  queries: 0,
  sources: false,
};

const useControllableOpen = (
  open: boolean | undefined,
  defaultOpen: boolean,
  onChange: ((next: boolean) => void) | undefined
) => {
  const [uncontrolled, setUncontrolled] = useState(defaultOpen);
  const value = open ?? uncontrolled;
  const setValue = (next: boolean) => {
    if (open === undefined) {
      setUncontrolled(next);
    }
    onChange?.(next);
  };
  return [value, setValue, setUncontrolled] as const;
};

export const PerplexitySearch = ({
  className,
  defaultOpen = false,
  duration,
  emptyDescription,
  extraCount,
  label = "Researched",
  labels,
  onOpenChange,
  onStepOpenChange,
  open: openProp,
  previewCount = PERPLEXITY_SEARCH_PREVIEW_COUNT,
  queries,
  reducedMotion = false,
  runningLabel = "Researching…",
  sequential = false,
  sources,
  stepDefaultOpen = false,
  stepOpen: stepOpenProp,
  title = "Searching the web",
  ...props
}: PerplexitySearchProps) => {
  const shouldSequence = sequential && !reducedMotion;
  const visiblePreviewCount = Math.min(
    Math.max(previewCount, 0),
    sources.length
  );
  const previewSources = sources.slice(0, visiblePreviewCount);
  const extraSources = sources.slice(visiblePreviewCount);
  const hiddenCount = extraSources.length || extraCount || 0;
  const [extrasOpen, setExtrasOpen] = useState(false);
  const [progress, setProgress] = useState(INITIAL_PROGRESS);
  const [uncontrolledOpen, setOpenState] = useState(defaultOpen);
  const open = openProp ?? uncontrolledOpen;
  const [stepOpen, setStepOpen, setStepOpenState] = useControllableOpen(
    stepOpenProp,
    stepDefaultOpen,
    onStepOpenChange
  );

  const visibleQueryCount = shouldSequence ? progress.queries : queries.length;
  const showSources = shouldSequence ? progress.sources : sources.length > 0;
  const running = shouldSequence && !progress.done;
  const previewLength = previewSources.length;

  useEffect(() => {
    if (!shouldSequence) {
      return;
    }

    let cancelled = false;
    setOpenState(true);
    setStepOpenState(true);

    const revealQuery = async (index: number): Promise<void> => {
      if (cancelled || index >= queries.length) {
        return;
      }
      setProgress((current) => ({ ...current, queries: index + 1 }));
      await wait(PERPLEXITY_SEARCH_QUERY_MS);
      await revealQuery(index + 1);
    };

    const run = async () => {
      await wait(PERPLEXITY_SEARCH_HEADER_MS);
      await revealQuery(0);
      if (cancelled) {
        return;
      }
      setProgress((current) => ({ ...current, sources: true }));
      await wait(
        Math.max(
          PERPLEXITY_SEARCH_SOURCES_MS,
          previewLength * PERPLEXITY_SEARCH_STAGGER_MS +
            PERPLEXITY_SEARCH_SETTLE_MS
        )
      );
      if (!cancelled) {
        setProgress((current) => ({ ...current, done: true }));
        setOpenState(false);
        setStepOpenState(false);
      }
    };

    run().catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [shouldSequence, queries, previewLength, setOpenState, setStepOpenState]);

  const visibleQueries = queries.slice(0, visibleQueryCount);
  const hasBody =
    queries.length > 0 || sources.length > 0 || Boolean(emptyDescription);
  const moreLabel = labels?.more(hiddenCount) ?? `+${hiddenCount} more`;

  let footer: ReactNode = null;
  if (hiddenCount > 0 && extraSources.length > 0) {
    footer = (
      <Collapsible onOpenChange={setExtrasOpen} open={extrasOpen}>
        <CollapsibleContent className={PANEL_CLASS} keepMounted>
          <ItemGroup className="min-h-0 gap-1.5 overflow-hidden pb-1.5">
            {extraSources.map((source) => (
              <SourceRow
                key={`${source.domain}-${source.title}`}
                source={source}
              />
            ))}
          </ItemGroup>
        </CollapsibleContent>
        <CollapsibleTrigger
          render={
            <Button
              className={cn(
                "text-pplx-subtle hover:text-pplx-secondary focus-visible:ring-pplx-ring dark:hover:text-pplx-secondary mt-1.5 h-auto rounded-sm border-0 p-0 text-sm leading-5 font-normal no-underline transition-colors hover:no-underline focus-visible:border-transparent focus-visible:ring-2 active:not-aria-[haspopup]:translate-y-0",
                shouldSequence && ENTER_CLASS
              )}
              variant="link"
            />
          }
        >
          {extrasOpen ? (labels?.showLess ?? "Show less") : moreLabel}
        </CollapsibleTrigger>
      </Collapsible>
    );
  } else if (hiddenCount > 0) {
    footer = (
      <p
        className={cn(
          "text-pplx-subtle mt-1.5 text-sm leading-5",
          shouldSequence && ENTER_CLASS
        )}
      >
        {moreLabel}
      </p>
    );
  }

  let sourcesBody: ReactNode = null;
  if (showSources && sources.length > 0) {
    sourcesBody = (
      <div>
        <ItemGroup className="gap-1.5">
          {previewSources.map((source, index) => (
            <SourceRow
              className={
                shouldSequence
                  ? cn(ENTER_CLASS, "delay-(--pplx-delay)")
                  : undefined
              }
              key={`${source.domain}-${source.title}`}
              source={source}
              style={
                {
                  "--pplx-delay": `${index * PERPLEXITY_SEARCH_STAGGER_MS}ms`,
                } as CSSProperties
              }
            />
          ))}
        </ItemGroup>
        {footer}
      </div>
    );
  } else if (!shouldSequence && emptyDescription) {
    sourcesBody = (
      <Empty className="items-start rounded-none border-0 p-0 text-left">
        <EmptyDescription className="text-pplx-subtle text-sm leading-5">
          {emptyDescription}
        </EmptyDescription>
      </Empty>
    );
  }

  const stepHeader = (
    <>
      <span className="flex size-6 shrink-0 items-center justify-center">
        <PerplexityWebSearchIcon className="text-pplx-muted size-4" />
      </span>
      <span className="text-pplx-muted min-w-0">{title}</span>
    </>
  );

  const step = hasBody ? (
    <Collapsible onOpenChange={setStepOpen} open={stepOpen}>
      <CollapsibleTrigger
        render={
          <Button className={cn(TRIGGER_CLASS, "group/step")} variant="ghost" />
        }
      >
        {stepHeader}
        <ChevronDown
          className={cn(
            CHEVRON_CLASS,
            "-rotate-90 group-data-panel-open/step:rotate-0"
          )}
          strokeWidth={1.75}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className={PANEL_CLASS} keepMounted>
        <div className="min-h-0 overflow-hidden">
          <div className="flex flex-col gap-1.5 ps-7.5 pt-2">
            <ItemGroup className="gap-1.5">
              {visibleQueries.map((query) => (
                <Item
                  className={cn(
                    ROW_CLASS,
                    "text-pplx-muted items-start",
                    shouldSequence && ENTER_CLASS
                  )}
                  key={query}
                  role="listitem"
                >
                  <ItemMedia className="h-5">
                    <Search
                      className="text-pplx-subtle size-4"
                      strokeWidth={1.75}
                    />
                  </ItemMedia>
                  <ItemContent className="min-w-0 gap-0">
                    <ItemTitle className="line-clamp-none w-auto text-sm leading-5 font-normal">
                      {query}
                    </ItemTitle>
                  </ItemContent>
                </Item>
              ))}
            </ItemGroup>
            {sourcesBody}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  ) : (
    <div className="flex items-center gap-1.5 text-sm leading-5">
      {stepHeader}
    </div>
  );

  return (
    <Collapsible
      className={cn("font-pplx w-full max-w-2xl", className)}
      data-slot="perplexity-search"
      onOpenChange={(next, details) => {
        if (openProp === undefined) {
          setOpenState(next);
        }
        onOpenChange?.(next, details);
      }}
      open={open}
      {...props}
    >
      <CollapsibleTrigger
        render={
          <Button
            className={cn(TRIGGER_CLASS, "group/search text-pplx-fg")}
            variant="ghost"
          />
        }
      >
        {running ? (
          <Shimmer className="[--shimmer-highlight:var(--color-pplx-fg)]">
            {runningLabel}
          </Shimmer>
        ) : (
          <span>
            {label}
            {duration ? (
              <span className="text-pplx-subtle"> {duration}</span>
            ) : null}
          </span>
        )}
        <ChevronDown
          className={cn(
            CHEVRON_CLASS,
            "-rotate-90 group-data-panel-open/search:rotate-0"
          )}
          strokeWidth={1.75}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className={PANEL_CLASS} keepMounted>
        <div className="min-h-0 overflow-hidden">
          <div className="flex gap-4 pt-2 pb-1">
            <Separator className="bg-pplx-border" orientation="vertical" />
            <div className="min-w-0 flex-1">{step}</div>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
