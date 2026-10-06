import { GitMergeIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Github } from "@notra/ui/components/ui/svgs/github";
import { cn } from "@notra/ui/lib/utils";

import {
  GITHUB_MERGED_BADGE_LABEL,
  GITHUB_PULL_REQUEST,
  GITHUB_REPOSITORY,
} from "@/constants/github-integration";

export function GithubPullRequestCard() {
  return (
    <div className="flex w-full grow basis-0 flex-col overflow-clip rounded-[0.75rem] border border-[#D0D7DE] bg-white font-sans lg:w-auto dark:border-[#30363D] dark:bg-[#0D1117]">
      <div className="flex items-center gap-2 border-b border-[#D0D7DE] bg-[#F6F8FA] px-4 py-2.5 dark:border-[#30363D] dark:bg-[#010409]">
        <Github className="size-4 shrink-0 text-[#1F2328] dark:text-[#F0F6FC]" />
        <span className="text-[0.8125rem] leading-4 text-[#1F2328] dark:text-[#F0F6FC]">
          {GITHUB_REPOSITORY}
        </span>
      </div>
      <div className="flex flex-col gap-2.5 px-4 pt-4">
        <h3 className="text-lg leading-6 font-normal text-[#1F2328] dark:text-[#F0F6FC]">
          {GITHUB_PULL_REQUEST.title}{" "}
          <span className="font-light text-[#59636E] dark:text-[#9198A1]">
            {GITHUB_PULL_REQUEST.number}
          </span>
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1 rounded-full bg-[#8250DF] px-2.5 py-1 text-xs leading-4 font-medium text-white">
            <HugeiconsIcon icon={GitMergeIcon} size={14} strokeWidth={2} />
            {GITHUB_MERGED_BADGE_LABEL}
          </span>
          <span className="text-xs leading-4 text-[#59636E] dark:text-[#9198A1]">
            <span className="font-semibold text-[#1F2328] dark:text-[#F0F6FC]">
              {GITHUB_PULL_REQUEST.author}
            </span>{" "}
            merged {GITHUB_PULL_REQUEST.commitCount} into{" "}
            <span className="rounded-md bg-[#DDF4FF] px-1 py-px font-mono text-[#0969DA] dark:bg-[#388BFD26] dark:text-[#4493F8]">
              {GITHUB_PULL_REQUEST.baseBranch}
            </span>{" "}
            from{" "}
            <span className="rounded-md bg-[#DDF4FF] px-1 py-px font-mono text-[#0969DA] dark:bg-[#388BFD26] dark:text-[#4493F8]">
              {GITHUB_PULL_REQUEST.headBranch}
            </span>
          </span>
        </div>
      </div>
      <div className="mt-3 flex gap-1 overflow-hidden border-b border-[#D0D7DE] px-4 dark:border-[#30363D]">
        {GITHUB_PULL_REQUEST.tabs.map((tab) => (
          <span
            className={cn(
              "flex shrink-0 items-center gap-1.5 border-b-2 px-2 pt-1 pb-2 text-xs leading-4 text-[#59636E] dark:text-[#9198A1]",
              tab.active
                ? "border-[#FD8C73] font-semibold text-[#1F2328] dark:border-[#F78166] dark:text-[#F0F6FC]"
                : "border-transparent"
            )}
            key={tab.label}
          >
            {tab.label}
            <span className="rounded-full bg-[#818B981F] px-1.5 text-[0.6875rem] leading-4 font-medium text-[#1F2328] dark:bg-[#656C7633] dark:text-[#F0F6FC]">
              {tab.count}
            </span>
          </span>
        ))}
      </div>
      <div className="flex flex-col gap-3 px-4 pt-4 pb-4">
        <div className="flex gap-2.5">
          <div className="size-7 shrink-0 rounded-full bg-[linear-gradient(135deg_in_oklab,oklab(89.3%_0.019_0.048)_0%,oklab(72.9%_0.086_0.095)_100%)]" />
          <div className="flex min-w-0 grow flex-col overflow-clip rounded-md border border-[#D0D7DE] dark:border-[#30363D]">
            <div className="border-b border-[#D0D7DE] bg-[#F6F8FA] px-3 py-1.5 text-xs leading-4 text-[#59636E] dark:border-[#30363D] dark:bg-[#151B23] dark:text-[#9198A1]">
              <span className="font-semibold text-[#1F2328] dark:text-[#F0F6FC]">
                {GITHUB_PULL_REQUEST.author}
              </span>{" "}
              commented {GITHUB_PULL_REQUEST.commentAge}
            </div>
            <p className="px-3 py-2.5 text-[0.8125rem] leading-[1.125rem] text-[#1F2328] dark:text-[#F0F6FC]">
              {GITHUB_PULL_REQUEST.comment}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 pl-2.5 text-xs leading-4 text-[#59636E] dark:text-[#9198A1]">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#8250DF] text-white">
            <HugeiconsIcon icon={GitMergeIcon} size={13} strokeWidth={2} />
          </span>
          <span className="min-w-0 truncate">
            <span className="font-semibold text-[#1F2328] dark:text-[#F0F6FC]">
              {GITHUB_PULL_REQUEST.author}
            </span>{" "}
            merged commit{" "}
            <span className="font-mono text-[#1F2328] dark:text-[#F0F6FC]">
              {GITHUB_PULL_REQUEST.mergeCommit}
            </span>{" "}
            into {GITHUB_PULL_REQUEST.baseBranch} {GITHUB_PULL_REQUEST.mergeAge}
          </span>
        </div>
      </div>
    </div>
  );
}
