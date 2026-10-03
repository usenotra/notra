"use client";

import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@notra/ui/components/ui/collapsible";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { parseDiffFromFile } from "@pierre/diffs";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useMemo } from "react";

import { SiteFileDiff } from "@/components/sites/editor/site-file-diff";
import { useSiteCodeHighlighter } from "@/lib/hooks/use-site-code-highlighter";
import { dashboardOrpc } from "@/lib/orpc/query";
import { cn } from "@/lib/utils";
import type { SitePublishChangeProps } from "@/types/site-editor";
import { toErrorMessage } from "@/utils/error-message";
import { diffLineCounts, siteFileIcon } from "@/utils/site-editor";

/** One file in the publish dialog: path and line counts, its diff on expand. */
export function SitePublishChange({
  organizationId,
  siteId,
  path,
  change,
  defaultOpen,
}: SitePublishChangeProps) {
  const t = useTranslations("sites.editorPage.publishDialog");
  const tEditor = useTranslations("sites.editor");
  const readQuery = useQuery(
    dashboardOrpc.sites.editor.read.queryOptions({
      input: { organizationId, siteId, path },
      refetchOnWindowFocus: false,
    })
  );
  const highlighterReady = useSiteCodeHighlighter();
  const document = readQuery.data ?? null;
  const before = change === "added" ? null : (document?.published ?? null);
  const after = change === "deleted" ? null : (document?.content ?? null);
  const counts = useMemo(() => {
    if (!document) {
      return null;
    }
    return diffLineCounts(
      parseDiffFromFile(
        before === null ? null : { name: path, contents: before },
        after === null ? null : { name: path, contents: after }
      )
    );
  }, [document, before, after, path]);

  let diff: React.ReactNode;
  if (readQuery.isPending || !highlighterReady) {
    diff = (
      <div aria-busy="true" className="space-y-2.5 px-4 py-3">
        <Skeleton className="h-3 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    );
  } else if (readQuery.isError) {
    diff = (
      <p className="text-muted-foreground px-4 py-3 text-[13px]">
        {toErrorMessage(readQuery.error, tEditor("loadFailed"))}
      </p>
    );
  } else {
    diff = (
      <SiteFileDiff
        after={after}
        before={before}
        diffStyle="unified"
        path={path}
      />
    );
  }

  return (
    <Collapsible className="group/change" defaultOpen={defaultOpen}>
      <CollapsibleTrigger className="hover:bg-muted/50 focus-visible:ring-ring/50 flex h-9 w-full items-center gap-2 px-3 text-left text-[13px] transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-inset">
        <HugeiconsIcon
          aria-hidden="true"
          className="text-muted-foreground shrink-0 transition-transform duration-150 group-data-[open]/change:rotate-90 motion-reduce:transition-none"
          icon={ArrowRight01Icon}
          size={13}
          strokeWidth={2}
        />
        <HugeiconsIcon
          aria-hidden="true"
          className="text-muted-foreground shrink-0"
          icon={siteFileIcon(path)}
          size={15}
          strokeWidth={1.5}
        />
        <span
          className={cn(
            "min-w-0 flex-1 truncate font-mono text-xs",
            change === "deleted" && "text-muted-foreground line-through"
          )}
          title={path}
        >
          {path}
        </span>
        {change === "modified" ? null : (
          <span className="text-muted-foreground shrink-0 text-xs">
            {t(change)}
          </span>
        )}
        {counts ? (
          <span className="flex shrink-0 items-center gap-1.5 font-mono text-xs tabular-nums">
            <span className="text-success">+{counts.additions}</span>
            <span className="text-destructive">−{counts.deletions}</span>
          </span>
        ) : null}
      </CollapsibleTrigger>
      <CollapsibleContent className="max-h-72 overflow-y-auto overscroll-contain border-t">
        {diff}
      </CollapsibleContent>
    </Collapsible>
  );
}
