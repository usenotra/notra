"use client";

import {
  ArrowDown01Icon,
  Copy01Icon,
  Loading03Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "use-intl";

import { Button } from "@/components/button";
import { SiteBuildLogFilter } from "@/components/sites/site-build-log-filter";
import { SiteBuildLogRows } from "@/components/sites/site-build-log-rows";
import { SITE_BUILD_LOG_FOLLOW_THRESHOLD } from "@/constants/sites";
import { cn } from "@/lib/utils";
import type {
  SiteBuildLogCopyButtonProps,
  SiteBuildLogEmptyProps,
  SiteBuildLogSummaryProps,
  SiteBuildLogsProps,
} from "@/types/components/sites";
import { copyTextToClipboard } from "@/utils/copy-to-clipboard";
import { formatCount } from "@/utils/format";
import {
  countLogLines,
  findMatches,
  groupBuildLog,
  logOffsets,
  parseBuildLog,
} from "@/utils/site-build-log";
import { stripAnsi } from "@/utils/site-deployments";

function BuildLogSummary({ lines, inProgress }: SiteBuildLogSummaryProps) {
  const t = useTranslations("sites.deploymentPage.log");
  if (inProgress) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span
          aria-hidden="true"
          className="bg-warning size-1.5 rounded-full motion-safe:animate-pulse"
        />
        {t("streaming")}
      </span>
    );
  }
  const errors = countLogLines(lines, "error");
  const warnings = countLogLines(lines, "warning");
  const parts = [t("lines", { count: lines.length })];
  if (errors > 0) {
    parts.push(t("errors", { count: errors }));
  }
  if (warnings > 0) {
    parts.push(t("warnings", { count: warnings }));
  }
  return parts.join(" · ");
}

function BuildLogEmpty({
  inProgress,
  queued,
  showSpinner = true,
}: SiteBuildLogEmptyProps) {
  const t = useTranslations("sites.deploymentPage.log");
  let message = t("empty");
  if (queued) {
    message = t("waiting");
  } else if (inProgress) {
    message = t("starting");
  }
  return (
    <div className="text-muted-foreground flex h-full min-h-28 items-center justify-center gap-2 px-4 py-8 text-sm">
      {inProgress && showSpinner ? (
        <HugeiconsIcon
          aria-hidden="true"
          className="size-4 motion-safe:animate-spin"
          icon={Loading03Icon}
          strokeWidth={1.75}
        />
      ) : null}
      {message}
    </div>
  );
}

function BuildLogCopyButton({ log }: SiteBuildLogCopyButtonProps) {
  const t = useTranslations("sites.deploymentPage.log");
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            aria-label={t("copy")}
            disabled={!log}
            onClick={() => {
              if (log) {
                copyTextToClipboard(stripAnsi(log), t("copied"));
              }
            }}
            size="icon-xs"
            variant="ghost"
          />
        }
      >
        <HugeiconsIcon icon={Copy01Icon} size={14} />
      </TooltipTrigger>
      <TooltipContent>{t("copy")}</TooltipContent>
    </Tooltip>
  );
}

export function SiteBuildLogs({
  log,
  heading,
  inProgress,
  queued,
  startAtEnd = false,
}: SiteBuildLogsProps) {
  const t = useTranslations("sites.deploymentPage.log");
  const locale = useLocale();
  const scrollRef = useRef<HTMLDivElement>(null);
  const followRef = useRef(true);
  const followedLiveRef = useRef(inProgress || startAtEnd);
  const [following, setFollowing] = useState(true);
  const [query, setQuery] = useState("");

  const lines = useMemo(() => (log ? parseBuildLog(log) : []), [log]);
  const entries = useMemo(() => groupBuildLog(lines), [lines]);
  const offsets = useMemo(() => logOffsets(lines), [lines]);
  const trimmedQuery = query.trim();
  const matchingLines = useMemo(
    () =>
      trimmedQuery
        ? lines.filter(
            (line) => findMatches(line.text, trimmedQuery).length > 0
          )
        : [],
    [lines, trimmedQuery]
  );

  useEffect(() => {
    if (inProgress) {
      followedLiveRef.current = true;
    }
    const element = scrollRef.current;
    if (
      element &&
      followedLiveRef.current &&
      followRef.current &&
      !trimmedQuery
    ) {
      element.scrollTop = element.scrollHeight;
    }
  }, [log, inProgress, trimmedQuery]);

  const jumpToLatest = () => {
    const element = scrollRef.current;
    if (element) {
      element.scrollTo({ top: element.scrollHeight, behavior: "smooth" });
    }
    followRef.current = true;
    setFollowing(true);
  };

  const body =
    lines.length === 0 ? (
      <BuildLogEmpty
        inProgress={inProgress}
        queued={queued}
        showSpinner={!heading}
      />
    ) : (
      <div className="relative">
        <div
          aria-busy={inProgress}
          aria-label={t("label")}
          className={cn(
            "scrollbar-floating overflow-auto py-2.5 font-mono text-xs leading-5",
            heading ? "h-72" : "max-h-[min(30rem,60vh)]"
          )}
          onScroll={(event) => {
            const element = event.currentTarget;
            const atBottom =
              element.scrollHeight - element.scrollTop - element.clientHeight <
              SITE_BUILD_LOG_FOLLOW_THRESHOLD;
            followRef.current = atBottom;
            setFollowing(atBottom);
          }}
          ref={scrollRef}
          role="log"
        >
          <SiteBuildLogRows
            entries={entries}
            matchingLines={matchingLines}
            offsets={offsets}
            query={trimmedQuery}
          />
        </div>
        {inProgress && !following ? (
          <Button
            className="absolute right-3 bottom-3"
            onClick={jumpToLatest}
            size="xs"
            variant="outline"
          >
            <HugeiconsIcon
              icon={ArrowDown01Icon}
              size={14}
              strokeWidth={1.75}
            />
            {t("jumpToLatest")}
          </Button>
        ) : null}
      </div>
    );

  return (
    <div className="min-w-0">
      <div className="border-border/60 bg-muted/40 overflow-hidden border-b">
        <div className="flex h-9 min-w-0 items-center gap-2 ps-3 pe-1">
          <div className="text-muted-foreground min-w-0 flex-1 truncate text-xs tabular-nums">
            {heading ?? (
              <BuildLogSummary inProgress={inProgress} lines={lines} />
            )}
          </div>
          {lines.length > 0 ? (
            <SiteBuildLogFilter onChange={setQuery} value={query} />
          ) : null}
          {trimmedQuery ? (
            <span
              aria-live="polite"
              className="text-muted-foreground shrink-0 text-xs tabular-nums"
            >
              {formatCount(matchingLines.length, locale)}
            </span>
          ) : null}
          <BuildLogCopyButton log={log} />
        </div>
      </div>
      <div
        className={cn(
          "bg-background relative min-w-0 overflow-hidden",
          heading && lines.length === 0 && "h-44"
        )}
      >
        {body}
      </div>
    </div>
  );
}
