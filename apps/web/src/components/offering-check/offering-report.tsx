"use client";

import { CtaButton } from "@notra/ui/components/shared/cta-button";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import Link from "next/link";

import { MarketingHeroWash } from "@/components/marketing-hero-wash";
import { TrackedSignupLink } from "@/components/tracked-signup-link";
import {
  OFFERING_CHECK_FORM_PATH,
  OFFERING_CHECK_MODEL_LABEL,
  OFFERING_CHECK_SIGNUP_SOURCE,
  OFFERING_COMPANY_OVERALL_BODY,
  OFFERING_OVERALL_COPY,
  OFFERING_REPORT_FAILURE_MESSAGES,
} from "@/constants/offering-check";
import { useOfferingStream } from "@/lib/offering-check/use-offering-stream";
import type {
  OfferingCompanyHeaderProps,
  OfferingReportProps,
} from "@/types/offering-check";
import { buildOfferingQuestion } from "@/utils/offering-check";

import { OfferingChatWindow } from "./offering-chat-window";
import { OfferingFavicon } from "./offering-favicon";
import { OfferingVerdictSummary } from "./offering-verdict-summary";

const sectionTitleClass =
  "font-display text-[1.625rem]/8 font-medium tracking-[-0.02em] text-[#1E1E1E] dark:text-white";
const metaClass =
  "font-sans text-[0.9375rem]/6 text-pretty text-[#1E1E1EBF] dark:text-white/70";
const backLinkClass =
  "font-sans text-[0.9375rem]/6 font-medium text-[#8B5CF6] hover:underline dark:text-[#A78BFA]";

function CompanyHeader({ domain, result }: OfferingCompanyHeaderProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3.5">
        <OfferingFavicon className="size-11 rounded-xl" domain={domain} />
        <div className="flex min-w-0 flex-col gap-0.5">
          {result ? (
            <h2 className={`${sectionTitleClass} truncate`}>
              {result.companyName}
            </h2>
          ) : (
            <Skeleton className="h-8 w-44" />
          )}
          <p className="font-sans text-[0.8125rem]/5 text-[#1E1E1E99] dark:text-white/50">
            {domain}, as described by {OFFERING_CHECK_MODEL_LABEL}
          </p>
        </div>
      </div>
      {result ? (
        <p className={`${metaClass} max-w-[46rem]`}>
          {result.companyDescription}
        </p>
      ) : (
        <div className="flex max-w-[46rem] flex-col gap-2">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-7/12" />
        </div>
      )}
      {result && result.otherOfferings.length > 0 ? (
        <ul
          aria-label={`What else ${OFFERING_CHECK_MODEL_LABEL} says you offer`}
          className="flex flex-wrap gap-1.5 pt-1"
        >
          {result.otherOfferings.map((offering) => (
            <li
              className="rounded-full border border-[#1E1E1E14] bg-white px-2.5 py-1 font-sans text-[0.8125rem]/5 text-[#1E1E1E] dark:border-white/10 dark:bg-white/[0.04] dark:text-white"
              key={offering}
            >
              {offering}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function OfferingReport({ input, initialResult }: OfferingReportProps) {
  const state = useOfferingStream(input, initialResult);
  const { result, status } = state;
  const hasFeature = input.feature.length > 0;
  const subject = hasFeature
    ? input.feature
    : (result?.companyName ?? input.domain);

  if (status !== "checking" && status !== "done") {
    return (
      <>
        <MarketingHeroWash
          subtitle={OFFERING_REPORT_FAILURE_MESSAGES[status]}
          title={
            <>
              We could not check <span className="text-primary">{subject}</span>
            </>
          }
        />
        <div className="flex w-full max-w-[64rem] px-4 sm:px-6">
          <Link className={backLinkClass} href={OFFERING_CHECK_FORM_PATH}>
            Back to the checker
          </Link>
        </div>
      </>
    );
  }

  const overall = result ? OFFERING_OVERALL_COPY[result.overall] : null;
  const overallBody =
    result && !hasFeature
      ? OFFERING_COMPANY_OVERALL_BODY[result.overall]
      : overall?.body;
  const question = buildOfferingQuestion(input);

  return (
    <>
      <MarketingHeroWash
        subtitle={
          overallBody ??
          `Once from memory, once with web search. You are watching the answers come in.`
        }
        title={
          <>
            {overall?.lead ?? `Asking ${OFFERING_CHECK_MODEL_LABEL} about `}
            <span className="text-primary">{subject}</span>
            {overall?.trail}
          </>
        }
      />
      <div className="flex w-full max-w-[72rem] flex-col gap-10 px-4 sm:px-6 md:gap-12">
        <CompanyHeader domain={input.domain} result={result} />

        <OfferingVerdictSummary result={result} />

        <div className="grid items-start gap-4 lg:grid-cols-2">
          <OfferingChatWindow
            feature={input.feature}
            mode="memory"
            question={question}
            state={state}
          />
          <OfferingChatWindow
            feature={input.feature}
            mode="search"
            question={question}
            state={state}
          />
        </div>

        <div className="flex flex-col items-start gap-4 rounded-3xl bg-[#C8B2EE40] p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8 dark:bg-[#231d3a]">
          <div className="flex flex-col gap-1">
            <h2 className="font-display text-[1.25rem]/7 font-medium tracking-[-0.02em] text-[#1E1E1E] dark:text-white">
              This was one question to one model
            </h2>
            <p className={`${metaClass} max-w-[36rem]`}>
              Notra asks ChatGPT, Claude, Gemini and Perplexity about your
              product every day, shows where they get it wrong and drafts the
              content that fixes it.
            </p>
          </div>
          <CtaButton
            className="shrink-0"
            nativeButton={false}
            render={<TrackedSignupLink source={OFFERING_CHECK_SIGNUP_SOURCE} />}
          >
            Start for free
          </CtaButton>
        </div>
      </div>
    </>
  );
}
