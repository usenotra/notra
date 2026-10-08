"use client";

import { Alert02Icon, CancelCircleIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { type ReactNode, useState } from "react";
import { useTranslations } from "use-intl";

import { SITE_BUILD_LOG_ROW_GRID } from "@/constants/sites";
import { cn } from "@/lib/utils";
import type {
  SiteBuildLogFoldRowProps,
  SiteBuildLogHighlightProps,
  SiteBuildLogLineProps,
  SiteBuildLogLineTextProps,
  SiteBuildLogRowsProps,
} from "@/types/components/sites";
import { findMatches, splitLogTag } from "@/utils/site-build-log";

function Highlighted({ text, query }: SiteBuildLogHighlightProps) {
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

function LineText({ line, query }: SiteBuildLogLineTextProps) {
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

function LogLine({ line, offset, query }: SiteBuildLogLineProps) {
  const tDiagnostics = useTranslations("sites.diagnostics");
  const marked =
    !line.continued && (line.tone === "error" || line.tone === "warning");
  return (
    <div
      className={cn(
        SITE_BUILD_LOG_ROW_GRID,
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
            aria-label={
              line.tone === "error"
                ? tDiagnostics("error")
                : tDiagnostics("warning")
            }
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

function FoldRow({ entry, offsets }: SiteBuildLogFoldRowProps) {
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
    <div className={SITE_BUILD_LOG_ROW_GRID}>
      <span aria-hidden="true" />
      <span aria-hidden="true" />
      <button
        className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 w-fit rounded-sm text-left font-sans transition-colors duration-150 outline-none focus-visible:ring-[3px]"
        onClick={() => setOpen(true)}
        type="button"
      >
        {t("folded", { count: entry.lines.length })}
      </button>
    </div>
  );
}

export function SiteBuildLogRows({
  entries,
  matchingLines,
  offsets,
  query,
}: SiteBuildLogRowsProps) {
  const t = useTranslations("sites.deploymentPage.log");
  if (!query) {
    return entries.map((entry) =>
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
  if (matchingLines.length === 0) {
    return (
      <p className="text-muted-foreground px-4 py-6 text-center font-sans text-sm">
        {t("noMatches")}
      </p>
    );
  }
  return matchingLines.map((line) => (
    <LogLine
      key={line.number}
      line={line}
      offset={offsets.get(line.number)}
      query={query}
    />
  ));
}
