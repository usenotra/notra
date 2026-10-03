import { Loading03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { CtaButton } from "@notra/ui/components/shared/cta-button";
import {
  Collapsible,
  CollapsibleContent,
} from "@notra/ui/components/ui/collapsible";
import { Input } from "@notra/ui/components/ui/input";
import { Label } from "@notra/ui/components/ui/label";
import { cn } from "@notra/ui/lib/utils";
import { useNavigate } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";

import {
  OFFERING_CHECK_DESCRIPTION_MAX_LENGTH,
  OFFERING_CHECK_FEATURE_MAX_LENGTH,
  OFFERING_CHECK_INVALID_MESSAGE,
  OFFERING_REPORT_FAILURE_MESSAGES,
  OFFERING_REPORT_PATH,
} from "@/constants/offering-check";
import { preflightOfferingCheck } from "@/lib/offering-check/preflight";
import { useSampleTyping } from "@/lib/offering-check/use-sample-typing";
import { offeringCheckRequestSchema } from "@/schemas/offering-check";
import type {
  OfferingCheckFormProps,
  OfferingCheckInput,
  OfferingFormProblem,
} from "@/types/offering-check";
import { storeOfferingDescription } from "@/utils/offering-report";

import { OfferingDomainFavicon } from "./offering-domain-favicon";
import { OfferingFavicon } from "./offering-favicon";
import { OfferingSentenceField } from "./offering-sentence-field";

const SWAP_CLASS =
  "transition-[opacity,scale,filter] duration-300 ease-[cubic-bezier(0.2,0,0,1)] [grid-area:1/1] motion-reduce:transition-none";
const SWAP_HIDDEN = "scale-25 opacity-0 blur-[4px]";
const REVEAL_CLASS =
  "h-(--collapsible-panel-height) overflow-hidden transition-[height,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] data-[ending-style]:h-0 data-[ending-style]:opacity-0 data-[starting-style]:h-0 data-[starting-style]:opacity-0 motion-reduce:transition-none";

export function OfferingCheckForm({ samples }: OfferingCheckFormProps) {
  const navigate = useNavigate();
  const [domain, setDomain] = useState("");
  const [feature, setFeature] = useState("");
  const [description, setDescription] = useState("");
  const [problem, setProblem] = useState<OfferingFormProblem | null>(null);
  const [pending, setPending] = useState(false);
  const typeSample = useSampleTyping((nextDomain, nextFeature) => {
    setDomain(nextDomain);
    setFeature(nextFeature);
  });

  const openReport = async (input: OfferingCheckInput) => {
    setProblem(null);
    setPending(true);
    const failure = await preflightOfferingCheck(input);
    if (failure) {
      setProblem(failure);
      setPending(false);
      return;
    }
    storeOfferingDescription(input);
    await navigate({
      to: OFFERING_REPORT_PATH,
      search: { domain: input.domain, feature: input.feature || undefined },
    });
  };

  const fillSample = (sample: OfferingCheckInput) => {
    setProblem(null);
    setDescription(sample.description);
    typeSample(sample);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = offeringCheckRequestSchema.safeParse({
      domain,
      feature,
      description,
    });
    if (parsed.success) {
      openReport(parsed.data);
    } else {
      setProblem("invalid");
    }
  };

  const invalid = problem === "invalid";

  return (
    <form className="flex flex-col" onSubmit={handleSubmit}>
      <p className="font-display text-foreground text-[1.75rem]/[1.55] font-medium tracking-[-0.02em] text-pretty sm:text-[2.25rem]/[1.5]">
        Does AI know{" "}
        <OfferingSentenceField
          autoCapitalize="none"
          autoComplete="url"
          id="offering-check-domain"
          inputMode="url"
          invalid={invalid}
          label="Your website"
          leading={<OfferingDomainFavicon value={domain} />}
          name="domain"
          onChange={(event) => {
            setDomain(event.target.value);
            setProblem(null);
          }}
          placeholder="acme.com"
          spellCheck={false}
          value={domain}
        />{" "}
        and{" "}
        <OfferingSentenceField
          autoComplete="off"
          id="offering-check-feature"
          invalid={false}
          label="Feature name, optional"
          maxLength={OFFERING_CHECK_FEATURE_MAX_LENGTH}
          name="feature"
          onChange={(event) => {
            setFeature(event.target.value);
            setProblem(null);
          }}
          placeholder="your feature"
          value={feature}
        />
        ?
      </p>

      <Collapsible open={feature.trim().length > 0}>
        <CollapsibleContent className={REVEAL_CLASS}>
          <div className="flex flex-col gap-2 px-px pt-6 pb-px">
            <Label
              className="text-foreground text-sm/4.5 font-medium"
              htmlFor="offering-check-description"
            >
              What it does
              <span className="pl-1.5 font-normal text-[#1E1E1E80] dark:text-white/45">
                optional
              </span>
            </Label>
            <Input
              autoComplete="off"
              className="h-11 rounded-xl border-[#E4E4E4] bg-transparent px-3.5 py-3 text-[0.9375rem]/5 shadow-none placeholder:text-[#1E1E1E66] dark:border-white/12 dark:placeholder:text-white/40"
              id="offering-check-description"
              maxLength={OFFERING_CHECK_DESCRIPTION_MAX_LENGTH}
              name="description"
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Emails a PDF of any dashboard on a schedule"
              value={description}
            />
            <p className="text-[0.8125rem]/5 text-[#1E1E1E99] dark:text-white/50">
              Only used to grade the answer. The model never sees it while
              answering.
            </p>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {problem ? (
        <p
          className={cn(
            "mt-4 text-[0.875rem]/5.5",
            invalid
              ? "text-[#9B1C1C] dark:text-[#FCA5A5]"
              : "text-foreground rounded-xl bg-[#F7F5FB] px-3.5 py-2.5 dark:bg-white/[0.04]"
          )}
          id={invalid ? "offering-check-error" : undefined}
          role="alert"
        >
          {invalid
            ? OFFERING_CHECK_INVALID_MESSAGE
            : OFFERING_REPORT_FAILURE_MESSAGES[problem]}
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
    </form>
  );
}
