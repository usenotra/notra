import { CtaButton } from "@notra/ui/components/shared/cta-button";
import { Link, useRouterState } from "@tanstack/react-router";

import { MarketingHeroWash } from "@/components/marketing-hero-wash";
import { TrackedSignupLink } from "@/components/tracked-signup-link";
import { Turnstile } from "@/components/turnstile";
import {
  OFFERING_CHECK_PATH,
  OFFERING_CHECK_SIGNUP_SOURCE,
  OFFERING_REPORT_FAILURE_MESSAGES,
} from "@/constants/offering-check";
import { OFFERING_TURNSTILE_ACTION } from "@/constants/turnstile";
import { useOfferingStream } from "@/lib/offering-check/use-offering-stream";
import type { OfferingReportProps } from "@/types/offering-check";
import { getOfferingHeroCopy } from "@/utils/offering-copy";

import { OfferingChatWindow } from "./offering-chat-window";
import { OfferingReportCard } from "./offering-report-card";

const metaClass =
  "font-sans text-[0.9375rem]/6 text-pretty text-[#1E1E1EBF] dark:text-white/70";
const backLinkClass =
  "font-sans text-[0.9375rem]/6 font-medium text-[#8B5CF6] hover:underline dark:text-[#A78BFA]";

export function OfferingReport({ input }: OfferingReportProps) {
  const turnstileToken = useRouterState({
    select: (router) => router.location.state.offeringTurnstileToken ?? "",
  });
  const { state, verify } = useOfferingStream(input, turnstileToken);
  const { result, status } = state;
  const hasFeature = input.feature.length > 0;
  const subject = hasFeature
    ? input.feature
    : (result?.companyName ?? input.domain);

  if (status === "verify") {
    return (
      <>
        <MarketingHeroWash
          subtitle="One quick check before we ask the model."
          title={
            <>
              Ready to check{" "}
              <span className="text-primary wrap-anywhere">{subject}</span>
            </>
          }
        />
        <div className="flex w-full max-w-[28rem] flex-col items-center gap-3 px-4 sm:px-6">
          <Turnstile
            action={OFFERING_TURNSTILE_ACTION}
            failureMessage="Verification could not load. Reload the page to try again."
            onToken={(token) => {
              if (token) {
                verify(token);
              }
            }}
          />
        </div>
      </>
    );
  }

  if (status !== "checking" && status !== "done") {
    return (
      <>
        <MarketingHeroWash
          subtitle={OFFERING_REPORT_FAILURE_MESSAGES[status]}
          title={
            <>
              We could not check{" "}
              <span className="text-primary wrap-anywhere">{subject}</span>
            </>
          }
        />
        <div className="flex w-full max-w-[64rem] px-4 sm:px-6">
          <Link
            className={backLinkClass}
            search={{
              domain: input.domain,
              feature: input.feature || undefined,
              problem: input.problem || undefined,
            }}
            to={OFFERING_CHECK_PATH}
          >
            Back to the checker
          </Link>
        </div>
      </>
    );
  }

  const hero = getOfferingHeroCopy(result, hasFeature);

  return (
    <>
      <MarketingHeroWash
        subtitle={hero.body}
        title={
          <>
            {hero.lead}
            <span className="text-primary wrap-anywhere">{subject}</span>
          </>
        }
      />
      <div className="flex w-full max-w-[64rem] flex-col gap-8 px-4 sm:px-6 md:gap-12">
        <OfferingReportCard input={input} state={state} />

        {state.threads.map((thread) => (
          <OfferingChatWindow
            feature={input.feature}
            hasFeature={hasFeature}
            key={thread.question.kind}
            thread={thread}
          />
        ))}

        <div className="flex flex-col items-start gap-4 rounded-3xl bg-[#C8B2EE40] p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8 dark:bg-[#231d3a]">
          <div className="flex flex-col gap-1">
            <h2 className="font-display text-foreground text-[1.25rem]/7 font-medium tracking-[-0.02em]">
              This was{" "}
              {state.threads.length === 1 ? "one question" : "two questions"} to
              one model
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
