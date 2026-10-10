import {
  CheckmarkCircle02Icon,
  GitPullRequestIcon,
  LockIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import {
  SITES_MOCK_SURFACE_CLASS,
  SITES_PREVIEW_CHECKS,
  SITES_PREVIEW_PR,
} from "@/constants/feature-pages/sites";

export function SitesCardPreviews() {
  return (
    <div aria-hidden="true" className={SITES_MOCK_SURFACE_CLASS}>
      <div className="flex flex-col gap-2 border-b px-5 pt-5 pb-4">
        <span className="text-foreground text-[1.0625rem]/6 font-semibold">
          {SITES_PREVIEW_PR.title}{" "}
          <span className="text-muted-foreground font-normal">
            {SITES_PREVIEW_PR.number}
          </span>
        </span>
        <span className="flex flex-wrap items-center gap-2 text-[0.8125rem]">
          <span className="flex items-center gap-1 rounded-full bg-[#1F883D] px-2.5 py-0.75 text-xs font-medium text-white">
            <HugeiconsIcon className="size-3.5" icon={GitPullRequestIcon} />
            Open
          </span>
          <span className="text-muted-foreground">
            <span className="text-foreground font-medium">
              {SITES_PREVIEW_PR.author}
            </span>{" "}
            wants to merge{" "}
            <code className="rounded-md bg-[#DDF4FF] px-1.5 py-0.5 font-mono text-[0.75rem] text-[#0969DA] dark:bg-[#388BFD]/15 dark:text-[#79C0FF]">
              {SITES_PREVIEW_PR.branch}
            </code>
          </span>
        </span>
      </div>

      <div className="m-4 flex flex-col overflow-clip rounded-xl border">
        <div className="bg-muted/60 flex items-center gap-2.5 border-b px-4 py-3">
          <span className="flex size-6 items-center justify-center rounded-full bg-[#1F883D]">
            <HugeiconsIcon
              className="size-3.5 text-white"
              icon={CheckmarkCircle02Icon}
            />
          </span>
          <span className="flex flex-col">
            <span className="text-foreground text-sm/5 font-semibold">
              All checks have passed
            </span>
            <span className="text-muted-foreground text-xs/4">
              2 successful checks
            </span>
          </span>
        </div>
        {SITES_PREVIEW_CHECKS.map((check) => (
          <div
            className="flex items-center gap-2.5 border-b px-4 py-2.5 text-[0.8125rem] last:border-b-0"
            key={check.name}
          >
            <HugeiconsIcon
              className="size-4 shrink-0 text-[#1F883D] dark:text-[#3FB950]"
              icon={CheckmarkCircle02Icon}
            />
            <span className="text-foreground truncate font-medium">
              {check.name}
            </span>
            <span className="text-muted-foreground truncate">
              {check.detail}
            </span>
            <span className="ml-auto shrink-0 font-medium text-[#0969DA] dark:text-[#4493F8]">
              Details
            </span>
          </div>
        ))}
      </div>

      <div className="mx-4 mb-4 flex items-center gap-3 rounded-xl border border-dashed px-4 py-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#F1ECFB] text-[#6D45D9] dark:bg-[#8B5CF6]/20 dark:text-[#C4B5FD]">
          <HugeiconsIcon className="size-4" icon={LockIcon} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-foreground truncate font-mono text-[0.8125rem]/5">
            {SITES_PREVIEW_PR.url}
          </span>
          <span className="text-muted-foreground text-xs/4">
            noindex · removed when the pull request closes
          </span>
        </span>
        <span className="bg-muted text-foreground shrink-0 rounded-md px-2 py-1 text-xs font-medium">
          {SITES_PREVIEW_PR.access}
        </span>
      </div>
    </div>
  );
}
