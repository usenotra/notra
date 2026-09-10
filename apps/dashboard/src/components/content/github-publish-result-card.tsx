"use client";

import { ArrowUpRight01Icon, GitCommitIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Notra } from "@notra/ui/components/ui/svgs/notra";

import type { GitHubPublishResultCardProps } from "@/types/content/detail";

export function GitHubPublishResultCard({
  pullRequest,
  repositoryLabel,
  title,
}: GitHubPublishResultCardProps) {
  const wasCreated = pullRequest.operation === "created";
  const prTitle = `docs: add ${title}`;
  const pathLabel = `${wasCreated ? "Added" : "Updated"} ${pullRequest.path}`;

  return (
    <div className="bg-muted/20 my-4 max-w-full min-w-0 overflow-hidden rounded-lg border">
      <div className="flex min-w-0 items-start gap-3 p-3">
        <div className="ring-foreground/10 flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#f6f3f1] p-1 ring-1">
          <Notra className="size-full" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium" title={prTitle}>
            {prTitle}
          </p>
          <p className="text-muted-foreground mt-1 truncate text-xs">
            {repositoryLabel}#{pullRequest.pullRequestNumber} ·{" "}
            {wasCreated ? "Created as draft" : "Updated"}
          </p>
        </div>
        <a
          aria-label={`Open pull request #${pullRequest.pullRequestNumber} on GitHub`}
          className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors focus-visible:ring-2 focus-visible:outline-none"
          href={pullRequest.pullRequestUrl}
          rel="noopener noreferrer"
          target="_blank"
        >
          <HugeiconsIcon className="size-4" icon={ArrowUpRight01Icon} />
        </a>
      </div>

      <div className="text-muted-foreground flex min-w-0 items-center gap-2 border-t px-3 py-2.5 text-xs">
        <HugeiconsIcon className="size-4 shrink-0" icon={GitCommitIcon} />
        <span className="min-w-0 flex-1 truncate" title={pathLabel}>
          {pathLabel}
        </span>
        <span aria-hidden="true" className="shrink-0">
          ·
        </span>
        <span
          className="max-w-32 shrink-0 truncate font-mono"
          title={pullRequest.branchName}
        >
          {pullRequest.branchName}
        </span>
      </div>
    </div>
  );
}
