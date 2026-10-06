import { Loading03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { CtaButton } from "@notra/ui/components/shared/cta-button";
import { Label } from "@notra/ui/components/ui/label";
import { Textarea } from "@notra/ui/components/ui/textarea";
import { cn } from "@notra/ui/lib/utils";
import { useNavigate } from "@tanstack/react-router";
import { debounce, defaultRateLimit, useQueryStates } from "nuqs";
import { type FocusEvent, type FormEvent, useRef, useState } from "react";

import { Turnstile } from "@/components/turnstile";
import {
  OFFERING_CHECK_PROBLEM_COUNTER_FROM,
  OFFERING_CHECK_PROBLEM_MAX_LENGTH,
  OFFERING_FORM_URL_DEBOUNCE_MS,
  OFFERING_CHECK_FEATURE_MAX_LENGTH,
  OFFERING_REPORT_PATH,
} from "@/constants/offering-check";
import { OFFERING_TURNSTILE_ACTION } from "@/constants/turnstile";
import { preflightOfferingCheck } from "@/lib/offering-check/preflight";
import { useSampleTyping } from "@/lib/offering-check/use-sample-typing";
import {
  offeringCheckRequestSchema,
  offeringFormParsers,
} from "@/schemas/offering-check";
import type {
  OfferingCheckFormProps,
  OfferingCheckInput,
  OfferingFormProblem,
  OfferingSampleField,
} from "@/types/offering-check";
import type { TurnstileHandle } from "@/types/turnstile";
import { describeOfferingNotice } from "@/utils/offering-copy";

import { OfferingDomainFavicon } from "./offering-domain-favicon";
import { OfferingErrorTooltip } from "./offering-error-tooltip";
import { OfferingFavicon } from "./offering-favicon";
import { OfferingSentenceField } from "./offering-sentence-field";

const SWAP_CLASS =
  "transition-[opacity,scale,filter] duration-300 ease-[cubic-bezier(0.2,0,0,1)] [grid-area:1/1] motion-reduce:transition-none";
const SWAP_HIDDEN = "scale-25 opacity-0 blur-[4px]";

export function OfferingCheckForm({ samples }: OfferingCheckFormProps) {
  const navigate = useNavigate();
  const [{ domain, feature, problem }, setValues] = useQueryStates(
    offeringFormParsers,
    {
      clearOnDefault: true,
      history: "replace",
      scroll: false,
      // State updates at once; the URL follows after typing pauses, so the
      // router does not re-render on every keystroke.
      limitUrlUpdates: debounce(OFFERING_FORM_URL_DEBOUNCE_MS),
    }
  );
  const [notice, setNotice] = useState<OfferingFormProblem | null>(null);
  // Counts failed submits so a repeated error shakes the field again.
  const [attempt, setAttempt] = useState(0);
  const [editingSentence, setEditingSentence] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const turnstile = useRef<TurnstileHandle>(null);
  const sentence = useRef<HTMLParagraphElement>(null);
  // Focus moving between the two sentence fields keeps the sentence "open".
  const leaveSentenceField = (event: FocusEvent<HTMLInputElement>) => {
    if (!sentence.current?.contains(event.relatedTarget)) {
      setEditingSentence(false);
    }
  };
  const fail = (problem: OfferingFormProblem) => {
    setNotice(problem);
    setAttempt((count) => count + 1);
  };
  const [pending, setPending] = useState(false);
  const { typeSample, stopTyping, finishTyping, typingField } = useSampleTyping(
    { domain, feature, problem },
    (values) => {
      void setValues(values);
    }
  );

  const openReport = async (input: OfferingCheckInput) => {
    setNotice(null);
    setPending(true);
    try {
      // Writes the URL now, so a still-pending debounced update cannot
      // replace the report entry after navigating.
      await setValues(
        {
          domain: input.domain,
          feature: input.feature,
          problem: input.problem,
        },
        { limitUrlUpdates: defaultRateLimit }
      );
      const failure = await preflightOfferingCheck(input);
      if (failure) {
        fail(failure);
        return;
      }
      await navigate({
        to: OFFERING_REPORT_PATH,
        search: {
          domain: input.domain,
          feature: input.feature || undefined,
          problem: input.problem || undefined,
        },
        // Tokens are single-use: the report spends this one on its scan, and
        // the form needs a new one if the visitor comes back.
        state: { offeringTurnstileToken: turnstileToken },
      });
      turnstile.current?.reset();
    } catch {
      fail("error");
    } finally {
      setPending(false);
    }
  };

  const fillSample = (sample: OfferingCheckInput) => {
    setNotice(null);
    typeSample(sample);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values = finishTyping() ?? { domain, feature, problem };
    const parsed = offeringCheckRequestSchema.safeParse(values);
    if (parsed.success) {
      openReport(parsed.data);
      return;
    }
    const invalidField = parsed.error.issues[0]?.path[0];
    if (invalidField === "feature") {
      fail("invalid-feature");
    } else if (invalidField === "problem") {
      fail("invalid-problem");
    } else {
      fail("invalid-domain");
    }
  };

  const editField = (values: Partial<OfferingCheckInput>) => {
    stopTyping();
    setNotice(null);
    void setValues(values);
  };

  const shown = notice ? describeOfferingNotice(notice) : null;
  const errorFor = (field: OfferingSampleField) =>
    shown?.field === field ? shown.message : null;
  const problemLeft = OFFERING_CHECK_PROBLEM_MAX_LENGTH - problem.length;
  const problemEnabled = feature.trim().length > 0 || typingField !== null;

  return (
    <form className="flex flex-col" onSubmit={handleSubmit}>
      {/* Two lines tall at least, so the fields closing up never moves the
          problem field below. */}
      <p
        className="font-display text-foreground min-h-[3.1em] text-[1.75rem]/[1.55] font-medium tracking-[-0.02em] text-pretty sm:min-h-[3em] sm:text-[2.25rem]/[1.5]"
        ref={sentence}
      >
        Does AI know{" "}
        <OfferingErrorTooltip
          attempt={attempt}
          error={errorFor("domain")}
          inline
        >
          <OfferingSentenceField
            active={typingField === "domain"}
            holdWidth={editingSentence}
            onBlur={leaveSentenceField}
            onFocus={() => setEditingSentence(true)}
            autoCapitalize="none"
            autoComplete="url"
            id="offering-check-domain"
            inputMode="url"
            invalid={errorFor("domain") !== null}
            label="Your website"
            leading={<OfferingDomainFavicon value={domain} />}
            name="domain"
            onChange={(event) => editField({ domain: event.target.value })}
            placeholder="acme.com"
            spellCheck={false}
            value={domain}
          />
        </OfferingErrorTooltip>{" "}
        and{" "}
        <OfferingErrorTooltip
          attempt={attempt}
          error={errorFor("feature")}
          inline
        >
          <OfferingSentenceField
            active={typingField === "feature"}
            holdWidth={editingSentence}
            onBlur={leaveSentenceField}
            onFocus={() => setEditingSentence(true)}
            autoComplete="off"
            id="offering-check-feature"
            invalid={errorFor("feature") !== null}
            label="Feature name, optional"
            maxLength={OFFERING_CHECK_FEATURE_MAX_LENGTH}
            name="feature"
            onChange={(event) => editField({ feature: event.target.value })}
            placeholder="your feature"
            value={feature}
          />
        </OfferingErrorTooltip>
        ?
      </p>

      {/* Always rendered so nothing below shifts when the feature gets a name. */}
      <div
        className={cn(
          "flex flex-col gap-2 pt-6 transition-opacity duration-200",
          problemEnabled ? null : "opacity-50"
        )}
      >
        <Label
          className="text-foreground text-sm/4.5 font-medium"
          htmlFor="offering-check-problem"
        >
          What problem does it solve?
          <span className="pl-1.5 font-normal text-[#1E1E1E80] dark:text-white/45">
            optional
          </span>
        </Label>
        <OfferingErrorTooltip attempt={attempt} error={errorFor("problem")}>
          <div className="relative">
            <Textarea
              autoComplete="off"
              aria-describedby={
                errorFor("problem") ? "offering-check-error" : undefined
              }
              aria-invalid={errorFor("problem") !== null}
              data-active={typingField === "problem" || undefined}
              className="min-h-20 resize-none rounded-xl border-[#E4E4E4] bg-transparent px-3.5 pt-3 pb-7 text-[0.9375rem]/6 shadow-none transition-[border-color,box-shadow] placeholder:text-[#1E1E1E66] data-active:border-[#8B5CF6] data-active:ring-3 data-active:ring-[#8B5CF6]/20 dark:border-white/12 dark:placeholder:text-white/40"
              id="offering-check-problem"
              maxLength={OFFERING_CHECK_PROBLEM_MAX_LENGTH}
              name="problem"
              onChange={(event) => editField({ problem: event.target.value })}
              disabled={!problemEnabled}
              placeholder={
                problemEnabled
                  ? "New bug reports pile up and nobody knows which team should pick them up."
                  : "Name a feature first"
              }
              rows={2}
              value={problem}
            />
            {/* Overlaid so the hint never shifts the layout. */}
            <span
              aria-hidden={problemLeft > OFFERING_CHECK_PROBLEM_COUNTER_FROM}
              className={cn(
                "pointer-events-none absolute end-3 bottom-2 text-xs tabular-nums transition-opacity duration-200",
                problemLeft > OFFERING_CHECK_PROBLEM_COUNTER_FROM
                  ? "opacity-0"
                  : "opacity-100",
                problemLeft <= 0
                  ? "text-[#9B1C1C] dark:text-[#FCA5A5]"
                  : "text-[#1E1E1E80] dark:text-white/45"
              )}
            >
              {problemLeft}
            </span>
          </div>
        </OfferingErrorTooltip>
      </div>

      {/* Field errors show as a tooltip on the field; this repeats them for screen readers. */}
      {shown?.field ? (
        <p className="sr-only" id="offering-check-error" role="alert">
          {shown.message}
        </p>
      ) : null}
      {shown && !shown.field ? (
        <p
          className="text-foreground mt-4 rounded-xl bg-[#F7F5FB] px-3.5 py-2.5 text-[0.875rem]/5.5 dark:bg-white/[0.04]"
          role="alert"
        >
          {shown.message}
        </p>
      ) : null}

      <div className="mt-7 flex flex-col-reverse gap-4 border-t border-[#1E1E1E0F] pt-5 sm:flex-row sm:items-center sm:justify-between dark:border-white/[0.06]">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="pe-1 text-[0.8125rem]/5 text-[#1E1E1E99] dark:text-white/50">
            Try
          </span>
          {samples.map((sample) => (
            <button
              className="text-foreground inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-[#F4F2F8] py-1 ps-1.5 pe-2.5 text-[0.8125rem]/5 font-medium transition-[background-color,color,scale] duration-150 ease-out outline-none hover:bg-[#EDE6FB] hover:text-[#5B3BB5] focus-visible:ring-2 focus-visible:ring-[#8B5CF6] active:scale-[0.96] disabled:opacity-60 motion-reduce:active:scale-100 dark:bg-white/[0.06] dark:hover:bg-[#8B5CF633] dark:hover:text-[#C4B5FD]"
              disabled={pending}
              key={`${sample.domain}:${sample.feature}`}
              onClick={() => fillSample(sample)}
              type="button"
            >
              <OfferingFavicon
                className="size-4 rounded"
                domain={sample.domain}
              />
              {sample.feature}
            </button>
          ))}
        </div>
        <CtaButton
          className="font-display h-auto shrink-0 self-start rounded-[2.5625rem] px-6 py-3 text-[1.125rem] leading-[1.14] font-medium tracking-[-0.015em] transition-[scale] duration-150 ease-out active:scale-[0.96] motion-reduce:active:scale-100 sm:self-auto"
          disabled={pending}
          type="submit"
        >
          <span className="grid place-items-center">
            <span
              aria-hidden={pending}
              className={cn(SWAP_CLASS, pending ? SWAP_HIDDEN : null)}
            >
              Ask AI
            </span>
            <span
              aria-hidden
              className={cn(SWAP_CLASS, pending ? null : SWAP_HIDDEN)}
            >
              <HugeiconsIcon
                className={cn(
                  "size-5 motion-reduce:animate-none",
                  pending ? "animate-spin" : null
                )}
                icon={Loading03Icon}
                strokeWidth={2}
              />
            </span>
          </span>
        </CtaButton>
      </div>
      {/* Invisible unless Cloudflare needs a click; uncached scans need it. */}
      <Turnstile
        action={OFFERING_TURNSTILE_ACTION}
        appearance="interaction-only"
        failureMessage="Verification could not load. You can still try; the report will ask again."
        onToken={setTurnstileToken}
        ref={turnstile}
      />
    </form>
  );
}
