"use client";

import { CtaButton } from "@notra/ui/components/shared/cta-button";
import { Link } from "@tanstack/react-router";
import { useSyncExternalStore } from "react";

import { MarketingHeroWash } from "@/components/marketing-hero-wash";
import { TrackedSignupLink } from "@/components/tracked-signup-link";
import {
  OFFERING_CHECK_FORM_PATH,
  OFFERING_CHECK_MODEL_LABEL,
  OFFERING_CHECK_SIGNUP_SOURCE,
  OFFERING_COMPANY_VERDICT_BODY,
  OFFERING_REPORT_FAILURE_MESSAGES,
  OFFERING_VERDICT_OVERVIEW_COPY,
} from "@/constants/offering-check";
import { useOfferingStream } from "@/lib/offering-check/use-offering-stream";
import { offeringCheckRequestSchema } from "@/schemas/offering-check";
import type {
  OfferingCheckInput,
  OfferingReportProps,
} from "@/types/offering-check";
import { buildOfferingQuestion } from "@/utils/offering-check";
import { readOfferingReportDescription } from "@/utils/offering-report";

import { OfferingChatWindow } from "./offering-chat-window";
import { OfferingReportCard } from "./offering-report-card";

const metaClass =
  "font-sans text-[0.9375rem]/6 text-pretty text-[#1E1E1EBF] dark:text-white/70";
const backLinkClass =
  "font-sans text-[0.9375rem]/6 font-medium text-[#8B5CF6] hover:underline dark:text-[#A78BFA]";

function subscribeToStoredDescription() {
  return () => {};
}

function OfferingReportContent({ input }: OfferingReportProps) {
  const state = useOfferingStream(input, null);
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
          <Link className={backLinkClass} to={OFFERING_CHECK_FORM_PATH}>
            Back to the checker
          </Link>
        </div>
      </>
    );
  }

  const overview = result
    ? OFFERING_VERDICT_OVERVIEW_COPY[result.verdict]
    : null;
  const overallBody =
    result && !hasFeature
      ? OFFERING_COMPANY_VERDICT_BODY[result.verdict]
      : overview?.body;
  const question = buildOfferingQuestion(input);

  return (
    <>
      <MarketingHeroWash
        subtitle={
          overallBody ??
          "Searching the web now. You are watching the answer come in."
        }
        title={
          <>
            {overview?.lead ?? `Asking ${OFFERING_CHECK_MODEL_LABEL} about `}
            <span className="text-primary">{subject}</span>
            {overview?.trail}
          </>
        }
      />
      <div className="flex w-full max-w-[64rem] flex-col gap-8 px-4 sm:px-6 md:gap-12">
        <OfferingReportCard input={input} state={state} />

        <OfferingChatWindow
          feature={input.feature}
          question={question}
          state={state}
        />

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

export function OfferingReport({ input }: OfferingReportProps) {
  const description = useSyncExternalStore(
    subscribeToStoredDescription,
    () => readOfferingReportDescription(input),
    () => null
  );

  const parsed = offeringCheckRequestSchema.safeParse({
    ...input,
    description,
  });
  const storedInput = parsed.success ? parsed.data : null;

  return storedInput ? (
    <OfferingReportContent
      input={storedInput}
      key={JSON.stringify(storedInput)}
    />
  ) : null;
}
