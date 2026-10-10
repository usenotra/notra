import { Link04Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { cn } from "@notra/ui/lib/utils";
import { useEffect, useState } from "react";

import {
  OFFERING_CHECK_MODEL_LABEL,
  OFFERING_LINK_COPIED_MS,
} from "@/constants/offering-check";
import { useElapsedSeconds } from "@/lib/offering-check/use-elapsed-seconds";
import type {
  OfferingReportCardProps,
  OfferingReportStatProps,
} from "@/types/offering-check";
import { copyToClipboard } from "@/utils/copy-to-clipboard";
import { getOfferingActivityLabel } from "@/utils/offering-copy";
import { offeringQuestionTitle } from "@/utils/offering-questions";
import { summarizeOfferingSources } from "@/utils/offering-sources";

import { OfferingFavicon } from "./offering-favicon";
import { OfferingVerdictRow } from "./offering-verdict-row";

const SWAP_CLASS =
  "transition-[opacity,scale,filter] duration-200 ease-[cubic-bezier(0.2,0,0,1)] [grid-area:1/1] motion-reduce:transition-none";
const SWAP_HIDDEN = "scale-50 opacity-0 blur-[2px]";

function ReportStat({
  label,
  value,
  pending = false,
}: OfferingReportStatProps) {
  return (
    <div className="flex min-w-0 flex-col gap-1 sm:px-5 sm:first:ps-0">
      <dt className="text-[0.8125rem]/5 text-[#1E1E1E99] dark:text-white/50">
        {label}
      </dt>
      <dd className="font-display text-foreground truncate text-[1.375rem]/7 font-medium tracking-[-0.02em] tabular-nums">
        {pending ? <Skeleton className="mt-1 h-6 w-14" /> : value}
      </dd>
    </div>
  );
}

function CopyLinkButton() {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) {
      return;
    }
    const timer = setTimeout(() => setCopied(false), OFFERING_LINK_COPIED_MS);
    return () => clearTimeout(timer);
  }, [copied]);

  return (
    <button
      className="text-foreground inline-flex h-8 min-w-8 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-full border border-[#1E1E1E14] bg-white text-[0.8125rem] font-medium transition-[background-color,scale] duration-150 ease-out outline-none hover:bg-[#F7F5FB] focus-visible:ring-2 focus-visible:ring-[#8B5CF6] active:scale-[0.96] motion-reduce:active:scale-100 sm:px-3 dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.08]"
      onClick={async () => {
        setCopied(
          await copyToClipboard(
            window.location.href,
            "Link to this report copied"
          )
        );
      }}
      type="button"
    >
      <span className="grid size-3.5 place-items-center">
        <HugeiconsIcon
          className={cn("size-3.5", SWAP_CLASS, copied ? SWAP_HIDDEN : null)}
          icon={Link04Icon}
          strokeWidth={2}
        />
        <HugeiconsIcon
          className={cn(
            "size-3.5 text-[#1C6B3F] dark:text-[#86EFAC]",
            SWAP_CLASS,
            copied ? null : SWAP_HIDDEN
          )}
          icon={Tick02Icon}
          strokeWidth={2}
        />
      </span>
      <span className="max-sm:sr-only">{copied ? "Copied" : "Copy link"}</span>
    </button>
  );
}

export function OfferingReportCard({ input, state }: OfferingReportCardProps) {
  const { result, threads } = state;
  const hasFeature = input.feature.length > 0;
  const answered = threads.every((thread) => thread.seconds !== null);
  const liveSeconds = useElapsedSeconds(!answered);
  const slowest = Math.max(...threads.map((thread) => thread.seconds ?? 0));
  const liveSites = new Set(threads.flatMap((thread) => thread.domains)).size;
  const sources = result ? summarizeOfferingSources(result.answers) : null;

  return (
    <div className="w-full rounded-3xl border border-[#1E1E1E14] bg-[linear-gradient(in_oklab_180deg,oklab(95.1%_0.011_-0.018_/_15%)_0%,oklab(93.7%_0.019_-0.031_/_75%)_100%)] p-2 sm:rounded-[2rem] sm:p-3 dark:border-white/10 dark:bg-white/[0.02] dark:bg-none">
      <div className="bg-background flex flex-col gap-7 rounded-2xl border border-[#1E1E1E0D] p-5 sm:rounded-[1.5rem] sm:p-8 dark:border-white/5">
        <div className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3.5">
              <OfferingFavicon
                className="size-11 rounded-xl"
                domain={input.domain}
              />
              <div className="flex min-w-0 flex-col gap-0.5">
                {result ? (
                  <h2 className="font-display text-foreground truncate text-[1.5rem]/8 font-medium tracking-[-0.02em]">
                    {result.companyName}
                  </h2>
                ) : (
                  <Skeleton className="h-8 w-40" />
                )}
                <p className="truncate text-[0.8125rem]/5 text-[#1E1E1E99] dark:text-white/50">
                  {input.domain} · asked {OFFERING_CHECK_MODEL_LABEL}{" "}
                  {input.webSearch ? "with web search" : "without web search"}
                </p>
              </div>
            </div>
            {result ? <CopyLinkButton /> : null}
          </div>
          {result ? (
            <p className="max-w-[46rem] text-[0.9375rem]/6 text-pretty text-[#1E1E1EBF] dark:text-white/70">
              {result.companyDescription}
            </p>
          ) : (
            <div className="flex max-w-[46rem] flex-col gap-2 py-0.5">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-7/12" />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-6 border-t border-[#1E1E1E0F] pt-6 dark:border-white/[0.06]">
          {threads.map((thread) => (
            <OfferingVerdictRow
              activity={getOfferingActivityLabel(thread)}
              key={thread.question.kind}
              kind={thread.question.kind}
              label={offeringQuestionTitle(thread.question.kind, hasFeature)}
              summary={thread.result?.summary ?? null}
              verdict={thread.result?.verdict ?? null}
            />
          ))}
        </div>

        <dl className="grid grid-cols-2 gap-y-5 rounded-2xl bg-[#F7F6F9] p-5 sm:grid-cols-4 sm:divide-x sm:divide-[#1E1E1E0F] dark:bg-white/[0.03] sm:dark:divide-white/[0.06]">
          <ReportStat
            label="Answered in"
            value={`${answered ? slowest : liveSeconds}s`}
          />
          {input.webSearch ? (
            <>
              <ReportStat
                label="Sites searched"
                value={sources?.sites ?? liveSites}
              />
              <ReportStat
                label="Pages read"
                pending={!result}
                value={sources?.pages ?? null}
              />
              <ReportStat
                label="Your site"
                pending={!result}
                value={sources?.ownSite ?? null}
              />
            </>
          ) : (
            <ReportStat label="Web search" value="Off" />
          )}
        </dl>

        {result && result.otherOfferings.length > 0 ? (
          <div className="flex flex-col gap-3">
            <h3 className="text-[0.8125rem]/5 wrap-anywhere text-[#1E1E1E99] dark:text-white/50">
              {hasFeature ? "What else" : "What"} {OFFERING_CHECK_MODEL_LABEL}{" "}
              says {result.companyName} offers
            </h3>
            <ul className="grid border-t border-[#1E1E1E0F] sm:grid-cols-2 sm:gap-x-8 dark:border-white/[0.06]">
              {result.otherOfferings.map((offering) => (
                <li
                  className="text-foreground border-b border-[#1E1E1E0F] py-2.5 text-[0.9375rem]/6 wrap-anywhere dark:border-white/[0.06]"
                  key={offering}
                >
                  {offering}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
