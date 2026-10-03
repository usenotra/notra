"use client";

import {
  Alert02Icon,
  ArrowDown01Icon,
  Cancel01Icon,
  CancelCircleIcon,
  Copy01Icon,
  Loading03Icon,
  Search01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import { useLocale, useTranslations } from "next-intl";
import {
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { Button } from "@/components/button";
import { SITE_BUILD_LOG_FOLLOW_THRESHOLD } from "@/constants/sites";
import { cn } from "@/lib/utils";
import type { SiteBuildLogEntry, SiteBuildLogLine } from "@/types/sites";
import { copyTextToClipboard } from "@/utils/copy-to-clipboard";
import { formatCount } from "@/utils/format";
import {
  countLogLines,
  findMatches,
  groupBuildLog,
  logOffsets,
  parseBuildLog,
  splitLogTag,
} from "@/utils/site-build-log";
import { stripAnsi } from "@/utils/site-deployments";

/** Grid shared by every row so offsets, markers and text line up. */
const ROW_GRID =
  "grid grid-cols-[2rem_0.875rem_minmax(0,1fr)] gap-x-2 px-2 sm:grid-cols-[2.5rem_0.875rem_minmax(0,1fr)] sm:gap-x-2.5 sm:px-3";

function Highlighted({ text, query }: { text: string; query: string }) {
  const ranges = findMatches(text, query);
  if (ranges.length === 0) {
    return text;
  }
  const parts: ReactNode[] = [];
  let cursor = 0;
  for (const [start, end] of ranges) {
    if (start > cursor) {
      parts.push(text.slice(cursor, start));
    }
    parts.push(
      <mark className="bg-primary/15 text-foreground rounded-xs" key={start}>
        {text.slice(start, end)}
      </mark>
    );
    cursor = end;
  }
  parts.push(text.slice(cursor));
  return parts;
}

function LineText({ line, query }: { line: SiteBuildLogLine; query: string }) {
  if (line.continued) {
    return <Highlighted query={query} text={line.text} />;
  }
  const { tag, rest } = splitLogTag(line.text);
  if (!tag) {
    return <Highlighted query={query} text={line.text} />;
  }
  return (
    <>
      <span className="text-muted-foreground">{tag}</span>{" "}
      <Highlighted query={query} text={rest} />
    </>
  );
}

function LogLine({
  line,
  offset,
  query,
}: {
  line: SiteBuildLogLine;
  offset: string | undefined;
  query: string;
}) {
  const marked =
    !line.continued && (line.tone === "error" || line.tone === "warning");
  return (
    <div
      className={cn(
        ROW_GRID,
        "[contain-intrinsic-size:auto_1.25rem] [content-visibility:auto]",
        line.tone === "error" && "bg-destructive/[0.04]",
        (line.continued || line.tone === "muted") && "text-muted-foreground"
      )}
      data-line={line.number}
    >
      <span
        className="text-muted-foreground/60 text-right tabular-nums select-none"
        title={line.timestamp ?? undefined}
      >
        {offset}
      </span>
      <span className="flex h-5 items-center">
        {marked ? (
          <HugeiconsIcon
            aria-label={line.tone}
            className={cn(
              "size-3.5",
              line.tone === "error" ? "text-destructive" : "text-warning"
            )}
            icon={line.tone === "error" ? CancelCircleIcon : Alert02Icon}
            role="img"
            strokeWidth={1.75}
          />
        ) : null}
      </span>
      <span className="min-h-5 [overflow-wrap:anywhere] whitespace-pre-wrap">
        <LineText line={line} query={query} />
      </span>
    </div>
  );
}

function FoldRow({
  entry,
  offsets,
}: {
  entry: Extract<SiteBuildLogEntry, { kind: "fold" }>;
  offsets: Map<number, string>;
}) {
  const t = useTranslations("sites.deploymentPage.log");
  const [open, setOpen] = useState(false);
  if (open) {
    return entry.lines.map((line) => (
      <LogLine
        key={line.number}
        line={line}
        offset={offsets.get(line.number)}
        query=""
      />
    ));
  }
  return (
    <div className={ROW_GRID}>
      <span aria-hidden="true" />
      <span aria-hidden="true" />
      <button
        className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 w-fit rounded-sm text-left font-sans transition-colors duration-150 outline-none focus-visible:ring-2"
        onClick={() => setOpen(true)}
        type="button"
      >
        {t("folded", { count: entry.lines.length })}
      </button>
    </div>
  );
}

/**
 * The build log as part of the build's story: the dashboard's own code
 * surface, the build's clock instead of wall times, tool tags quieted,
 * warnings and errors marked in the gutter, and the noise (route trees,
 * stack frames, code frames) folded. While the build runs it follows new
 * output unless the reader scrolled up.
 */
export function SiteBuildLogs({
  log,
  inProgress,
  queued,
  startAtEnd = false,
}: {
  log: string | null;
  inProgress: boolean;
  /** Still waiting for a builder; the log starts once the sandbox boots. */
  queued: boolean;
  /** Open scrolled to the end, e.g. for a failed build whose error is last. */
  startAtEnd?: boolean;
}) {
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
  const warnings = countLogLines(lines, "warning");
  const errors = countLogLines(lines, "error");
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

  // Follow new output while the build runs, unless the reader scrolled up.
  // The final upload lands together with the finished status, so a log that
  // was followed live keeps following once more.
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

  const onFilterKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape" && query) {
      event.preventDefault();
      setQuery("");
    }
  };

  const jumpToLatest = () => {
    const element = scrollRef.current;
    if (element) {
      element.scrollTo({ top: element.scrollHeight, behavior: "smooth" });
    }
    followRef.current = true;
    setFollowing(true);
  };

  let emptyMessage = t("empty");
  if (queued) {
    emptyMessage = t("waiting");
  } else if (inProgress) {
    emptyMessage = t("starting");
  }

  let body: ReactNode;
  if (lines.length === 0) {
    body = (
      <div className="text-muted-foreground flex min-h-28 items-center justify-center gap-2 px-4 py-8 text-sm">
        {inProgress ? (
          <HugeiconsIcon
            aria-hidden="true"
            className="size-4 motion-safe:animate-spin"
            icon={Loading03Icon}
            strokeWidth={1.75}
          />
        ) : null}
        {emptyMessage}
      </div>
    );
  } else {
    let rows: ReactNode;
    if (trimmedQuery) {
      rows =
        matchingLines.length > 0 ? (
          matchingLines.map((line) => (
            <LogLine
              key={line.number}
              line={line}
              offset={offsets.get(line.number)}
              query={trimmedQuery}
            />
          ))
        ) : (
          <p className="text-muted-foreground px-4 py-6 text-center font-sans text-sm">
            {t("noMatches")}
          </p>
        );
    } else {
      rows = entries.map((entry) =>
        entry.kind === "line" ? (
          <LogLine
            key={entry.line.number}
            line={entry.line}
            offset={offsets.get(entry.line.number)}
            query=""
          />
        ) : (
          <FoldRow entry={entry} key={entry.id} offsets={offsets} />
        )
      );
    }
    body = (
      <div className="relative">
        <div
          aria-busy={inProgress}
          aria-label={t("label")}
          className="scrollbar-floating max-h-[min(30rem,60vh)] overflow-auto py-2.5 font-mono text-xs leading-5"
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
          {rows}
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
  }

  let summary: ReactNode;
  if (inProgress) {
    summary = (
      <span className="inline-flex items-center gap-1.5">
        <span
          aria-hidden="true"
          className="bg-warning size-1.5 rounded-full motion-safe:animate-pulse"
        />
        {t("streaming")}
      </span>
    );
  } else {
    const parts = [t("lines", { count: lines.length })];
    if (errors > 0) {
      parts.push(t("errors", { count: errors }));
    }
    if (warnings > 0) {
      parts.push(t("warnings", { count: warnings }));
    }
    summary = parts.join(" · ");
  }

  return (
    <div className="min-w-0">
      <div className="border-border/60 bg-muted/40 overflow-hidden rounded-t-lg border border-b-0 pb-3">
        <div className="flex h-9 min-w-0 items-center gap-2 ps-3 pe-1">
          <span className="text-muted-foreground min-w-0 flex-1 truncate text-xs tabular-nums">
            {summary}
          </span>
          {lines.length > 0 ? (
            <label className="text-muted-foreground focus-within:text-foreground relative flex h-7 w-32 items-center sm:w-44">
              <HugeiconsIcon
                aria-hidden="true"
                className="pointer-events-none absolute start-2 size-3.5"
                icon={Search01Icon}
                strokeWidth={1.75}
              />
              <input
                aria-label={t("filter")}
                className="text-foreground placeholder:text-muted-foreground hover:bg-background/60 focus:bg-background focus:border-border h-full w-full rounded-md border border-transparent bg-transparent ps-7 pe-6 text-xs transition-colors duration-150 outline-none"
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={onFilterKeyDown}
                placeholder={t("filter")}
                spellCheck={false}
                type="text"
                value={query}
              />
              {query ? (
                <button
                  aria-label={t("clearFilter")}
                  className="hover:text-foreground absolute end-1 flex size-5 items-center justify-center rounded-sm"
                  onClick={() => setQuery("")}
                  type="button"
                >
                  <HugeiconsIcon
                    className="size-3"
                    icon={Cancel01Icon}
                    strokeWidth={2}
                  />
                </button>
              ) : null}
            </label>
          ) : null}
          {trimmedQuery ? (
            <span
              aria-live="polite"
              className="text-muted-foreground shrink-0 text-xs tabular-nums"
            >
              {formatCount(matchingLines.length, locale)}
            </span>
          ) : null}
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
        </div>
      </div>
      <div className="border-border/60 bg-background relative -mt-3 min-w-0 overflow-hidden rounded-lg border">
        {body}
      </div>
    </div>
  );
}
