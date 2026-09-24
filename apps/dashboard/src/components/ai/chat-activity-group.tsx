"use client";

import {
  ArrowDown01Icon,
  GlobalIcon,
  Search01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Shimmer } from "@notra/ui/components/ai-elements/shimmer";
import { BrailleLoader } from "@notra/ui/components/shared/braille-loader";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@notra/ui/components/ui/collapsible";
import { cn } from "@notra/ui/lib/utils";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import {
  ACTIVITY_AUTO_CLOSE_DELAY_MS,
  ACTIVITY_CONTENT_CLASSNAME,
  VISIBLE_SEARCH_SOURCE_COUNT,
} from "@/constants/chat-activity";
import type {
  ChatActivityGroupProps,
  ChatSearchStackProps,
} from "@/types/components/chat-activity-group";
import {
  getSearchQuery,
  getSearchRowLabel,
  getSearchSources,
  getSearchStackLabel,
  uniqueSearchSources,
} from "@/utils/chat-search-activity";
import { formatWorkedDurationLabel } from "@/utils/format-worked-duration";

const NESTED_ROW_CLASSNAME =
  "text-muted-foreground flex min-w-0 items-center gap-2 text-sm leading-5";

function useWorkedDurationSeconds(
  isStreaming: boolean,
  durationMs: number | undefined
): number | null {
  const fromMetadata =
    durationMs == null ? null : Math.max(1, Math.round(durationMs / 1000));
  const startedAtRef = useRef<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState<number | null>(
    isStreaming ? 0 : null
  );

  useEffect(() => {
    if (isStreaming) {
      startedAtRef.current ??= Date.now();
      const started = startedAtRef.current;
      const tick = () => {
        setElapsedSeconds(
          Math.max(0, Math.floor((Date.now() - started) / 1000))
        );
      };
      tick();
      const interval = window.setInterval(tick, 1000);
      return () => window.clearInterval(interval);
    }

    if (startedAtRef.current !== null) {
      setElapsedSeconds(
        Math.max(1, Math.ceil((Date.now() - startedAtRef.current) / 1000))
      );
    }
  }, [isStreaming]);

  return elapsedSeconds ?? fromMetadata;
}

export function ChatActivityGroup({
  children,
  durationMs,
  forceOpen = false,
  groupId,
  isStreaming,
}: ChatActivityGroupProps) {
  const durationSeconds = useWorkedDurationSeconds(isStreaming, durationMs);
  const [isOpen, setIsOpen] = useState(isStreaming || forceOpen);
  const [wasStreaming, setWasStreaming] = useState(isStreaming);

  if (wasStreaming !== isStreaming) {
    setWasStreaming(isStreaming);
    if (isStreaming || forceOpen) {
      setIsOpen(true);
    }
  }

  useEffect(() => {
    if (isStreaming || forceOpen) {
      return;
    }
    const closeTimer = window.setTimeout(() => {
      setIsOpen(false);
    }, ACTIVITY_AUTO_CLOSE_DELAY_MS);
    return () => window.clearTimeout(closeTimer);
  }, [forceOpen, isStreaming]);

  const label = formatWorkedDurationLabel(durationSeconds, isStreaming);
  const showWorkingLoader =
    isStreaming && (!durationSeconds || durationSeconds <= 0);

  return (
    <Collapsible
      data-activity-group={groupId}
      onOpenChange={setIsOpen}
      open={isOpen}
    >
      <CollapsibleTrigger className="text-muted-foreground hover:text-foreground group flex w-full min-w-0 items-center gap-1 text-sm transition-colors">
        {showWorkingLoader ? (
          <BrailleLoader className="text-sm" label={label} />
        ) : null}
        {isStreaming && !showWorkingLoader ? (
          <Shimmer as="span" className="min-w-0 truncate text-sm leading-5">
            {label}
          </Shimmer>
        ) : null}
        {isStreaming ? null : (
          <span className="min-w-0 truncate leading-5">{label}</span>
        )}
        <HugeiconsIcon
          aria-hidden
          className={cn(
            "text-muted-foreground/60 size-3.5 shrink-0 transition-transform",
            isOpen ? "rotate-180" : "rotate-0"
          )}
          icon={ArrowDown01Icon}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className={ACTIVITY_CONTENT_CLASSNAME}>
        <div className="mt-1.5 flex flex-col gap-1">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function SearchFavicon({ domain }: { domain?: string }) {
  const [failed, setFailed] = useState(false);
  if (!domain || failed) {
    return (
      <HugeiconsIcon
        className="size-3.5 shrink-0"
        icon={GlobalIcon}
        strokeWidth={1.8}
      />
    );
  }

  return (
    <Image
      alt=""
      className="bg-muted size-3.5 shrink-0 rounded-full"
      height={14}
      onError={() => setFailed(true)}
      src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=32`}
      unoptimized
      width={14}
    />
  );
}

export function ChatSearchStack({ items }: ChatSearchStackProps) {
  const [showAllSources, setShowAllSources] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const isStreaming = items.some(
    (item) =>
      item.state === "input-streaming" || item.state === "input-available"
  );
  const label = getSearchStackLabel(items.length, isStreaming);
  const queries = items.map((item) => getSearchQuery(item.input));
  const uniqueSources = uniqueSearchSources(
    items.flatMap((item) => getSearchSources(item.output))
  );
  const visibleSources = showAllSources
    ? uniqueSources
    : uniqueSources.slice(0, VISIBLE_SEARCH_SOURCE_COUNT);
  const hiddenSourceCount = uniqueSources.length - visibleSources.length;

  return (
    <Collapsible onOpenChange={setIsOpen} open={isOpen}>
      <CollapsibleTrigger className="text-muted-foreground hover:text-foreground group flex w-full min-w-0 items-center gap-2 text-sm transition-colors">
        <HugeiconsIcon
          className="size-3.5 shrink-0"
          icon={Search01Icon}
          strokeWidth={1.8}
        />
        {isStreaming ? (
          <Shimmer as="span" className="min-w-0 truncate text-sm leading-5">
            {label}
          </Shimmer>
        ) : (
          <span className="min-w-0 truncate leading-5">{label}</span>
        )}
        <HugeiconsIcon
          aria-hidden
          className={cn(
            "text-muted-foreground/60 size-3.5 shrink-0 transition-transform",
            isOpen ? "rotate-180" : "rotate-0"
          )}
          icon={ArrowDown01Icon}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className={ACTIVITY_CONTENT_CLASSNAME}>
        <div className="border-border/70 mt-1 ml-1.5 flex flex-col gap-1 border-l pl-3">
          {items.map((item, index) => {
            const query = queries[index];
            return (
              <div className={NESTED_ROW_CLASSNAME} key={item.toolCallId}>
                <HugeiconsIcon
                  className="size-3.5 shrink-0"
                  icon={GlobalIcon}
                  strokeWidth={1.8}
                />
                <span className="min-w-0 truncate">
                  {getSearchRowLabel(
                    query,
                    item.state === "input-streaming" ||
                      item.state === "input-available",
                    isStreaming
                  )}
                </span>
              </div>
            );
          })}
          {visibleSources.map((source) => {
            const content = (
              <>
                <SearchFavicon domain={source.domain} />
                <span className="text-foreground min-w-0 truncate">
                  {source.title}
                </span>
                {source.domain ? (
                  <span className="text-muted-foreground/70 shrink-0">
                    {source.domain}
                  </span>
                ) : null}
              </>
            );
            if (!source.url) {
              return (
                <div className={NESTED_ROW_CLASSNAME} key={source.title}>
                  {content}
                </div>
              );
            }
            return (
              <a
                className={cn(
                  NESTED_ROW_CLASSNAME,
                  "hover:text-foreground transition-colors"
                )}
                href={source.url}
                key={source.url}
                rel="noreferrer"
                target="_blank"
              >
                {content}
              </a>
            );
          })}
          {hiddenSourceCount > 0 ? (
            <button
              className="text-muted-foreground hover:text-foreground w-fit text-left text-sm transition-colors"
              onClick={() => setShowAllSources(true)}
              type="button"
            >
              +{hiddenSourceCount} more
            </button>
          ) : null}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
