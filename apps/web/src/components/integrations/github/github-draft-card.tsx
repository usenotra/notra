import { NotraMark } from "@/components/notra-mark";
import {
  GITHUB_DRAFT_ACTION_LABEL,
  GITHUB_DRAFT_BODY,
  GITHUB_DRAFT_HEADLINE,
  GITHUB_DRAFT_META,
  GITHUB_DRAFT_TITLE,
} from "@/constants/github-integration";

export function GithubDraftCard() {
  return (
    <div className="flex w-full grow basis-0 flex-col overflow-clip rounded-[1.25rem] bg-white [box-shadow:#ECECEC_0_0_0_0.0625rem,#28282820_0_0.5rem_1.5rem_-0.5rem] lg:w-auto dark:bg-[#17131F] dark:[box-shadow:#FFFFFF14_0_0_0_0.0625rem]">
      <div className="flex items-center justify-between px-5 py-3.5 [box-shadow:#F0F0F0_0_-0.0625rem_0_inset] dark:[box-shadow:#FFFFFF14_0_-0.0625rem_0_inset]">
        <div className="flex items-center gap-2">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-md dark:bg-[#F6F3F1] dark:shadow-sm dark:ring-1 dark:inset-shadow-sm dark:shadow-black/40 dark:ring-white/10 dark:inset-shadow-white/8">
            <NotraMark className="size-4 shrink-0" />
          </span>
          <span className="font-sans text-sm leading-[1.125rem] font-semibold text-[#1E1E1E] dark:text-white">
            {GITHUB_DRAFT_TITLE}
          </span>
        </div>
        <span className="cta-gradient-primary-flat flex items-center rounded-full px-3.5 py-1.25 font-sans text-xs leading-4 font-semibold text-white">
          {GITHUB_DRAFT_ACTION_LABEL}
        </span>
      </div>
      <div className="flex flex-col gap-2 px-5 pt-4 pb-5">
        <span className="font-sans text-base leading-[1.3125rem] font-semibold tracking-[-0.01em] text-[#1E1E1E] dark:text-white">
          {GITHUB_DRAFT_HEADLINE}
        </span>
        <p className="font-sans text-[0.8125rem] leading-5 text-[#1E1E1EBF] dark:text-white/75">
          {GITHUB_DRAFT_BODY}
        </p>
        <span className="font-sans text-xs leading-4 font-medium text-[#1E1E1E80] dark:text-white/50">
          {GITHUB_DRAFT_META}
        </span>
      </div>
    </div>
  );
}
