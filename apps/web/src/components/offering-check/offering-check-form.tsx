"use client";

import { ArrowDown01Icon, Loading03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { CtaButton } from "@notra/ui/components/shared/cta-button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@notra/ui/components/ui/collapsible";
import { Input } from "@notra/ui/components/ui/input";
import { Label } from "@notra/ui/components/ui/label";
import { cn } from "@notra/ui/lib/utils";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import {
  OFFERING_CHECK_DESCRIPTION_MAX_LENGTH,
  OFFERING_CHECK_FEATURE_MAX_LENGTH,
  OFFERING_CHECK_INVALID_MESSAGE,
  OFFERING_CHECK_PREFLIGHT_PATH,
  OFFERING_REPORT_FAILURE_MESSAGES,
} from "@/constants/offering-check";
import { offeringCheckRequestSchema } from "@/schemas/offering-check";
import type {
  OfferingCheckFormProps,
  OfferingCheckInput,
} from "@/types/offering-check";
import { offeringReportHref } from "@/utils/offering-report";

import { OfferingFavicon } from "./offering-favicon";

const labelClass =
  "font-sans text-sm/4.5 font-medium text-[#1E1E1E] dark:text-white";
const SWAP_CLASS =
  "transition-[opacity,scale,filter] duration-300 ease-[cubic-bezier(0.2,0,0,1)] [grid-area:1/1] motion-reduce:transition-none";
const SWAP_HIDDEN = "scale-25 opacity-0 blur-[4px]";
const optionalClass = "pl-1.5 font-normal text-[#1E1E1E80] dark:text-white/45";
const inputClass =
  "h-11 rounded-xl border-[#E4E4E4] bg-transparent px-3.5 py-3 font-sans text-[0.9375rem]/5 shadow-none placeholder:text-[#1E1E1E66] dark:border-white/12 dark:placeholder:text-white/40";

export function OfferingCheckForm({ samples }: OfferingCheckFormProps) {
  const router = useRouter();
  const [domain, setDomain] = useState("");
  const [feature, setFeature] = useState("");
  const [description, setDescription] = useState("");
  const [invalid, setInvalid] = useState(false);
  const [blocked, setBlocked] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const openReport = async (input: OfferingCheckInput) => {
    setBlocked(null);
    setPending(true);
    const response = await fetch(OFFERING_CHECK_PREFLIGHT_PATH, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }).catch(() => null);
    if (response?.status === 429) {
      setBlocked(OFFERING_REPORT_FAILURE_MESSAGES["rate-limited"]);
      setPending(false);
      return;
    }
    if (response?.status === 503) {
      setBlocked(OFFERING_REPORT_FAILURE_MESSAGES.unavailable);
      setPending(false);
      return;
    }
    router.push(offeringReportHref(input));
  };

  const fillSample = (sample: OfferingCheckInput) => {
    setDomain(sample.domain);
    setFeature(sample.feature);
    setDescription(sample.description);
    setInvalid(false);
    setBlocked(null);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = offeringCheckRequestSchema.safeParse({
      domain,
      feature,
      description,
    });
    if (!parsed.success) {
      setInvalid(true);
      return;
    }
    openReport(parsed.data);
  };

  return (
    <div className="flex flex-col gap-4">
      <form className="flex flex-col" onSubmit={handleSubmit}>
        <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div className="flex flex-col gap-2">
            <Label className={labelClass} htmlFor="offering-check-domain">
              Your website
            </Label>
            <Input
              aria-describedby={invalid ? "offering-check-error" : undefined}
              aria-invalid={invalid}
              autoCapitalize="none"
              autoComplete="url"
              className={inputClass}
              id="offering-check-domain"
              inputMode="url"
              name="domain"
              onChange={(event) => {
                setDomain(event.target.value);
                setInvalid(false);
              }}
              placeholder="acme.com"
              spellCheck={false}
              value={domain}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label className={labelClass} htmlFor="offering-check-feature">
              Feature name
              <span className={optionalClass}>optional</span>
            </Label>
            <Input
              aria-describedby={invalid ? "offering-check-error" : undefined}
              aria-invalid={invalid}
              autoComplete="off"
              className={inputClass}
              id="offering-check-feature"
              maxLength={OFFERING_CHECK_FEATURE_MAX_LENGTH}
              name="feature"
              onChange={(event) => {
                setFeature(event.target.value);
                setInvalid(false);
              }}
              placeholder="Scheduled reports"
              value={feature}
            />
          </div>
          <CtaButton
            className="font-display h-auto shrink-0 rounded-[2.5625rem] px-6 py-3 text-[1.125rem] leading-[1.14] font-medium tracking-[-0.015em] transition-[scale] duration-150 ease-out active:scale-[0.96] motion-reduce:active:scale-100"
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
        <Collapsible open={feature.trim().length > 0}>
          <CollapsibleContent className="h-(--collapsible-panel-height) overflow-hidden transition-[height,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] data-[ending-style]:h-0 data-[ending-style]:opacity-0 data-[starting-style]:h-0 data-[starting-style]:opacity-0 motion-reduce:transition-none">
            <div className="flex flex-col gap-2 px-px pt-4 pb-px">
              <Label
                className={labelClass}
                htmlFor="offering-check-description"
              >
                What it does
                <span className={optionalClass}>optional</span>
              </Label>
              <Input
                autoComplete="off"
                className={inputClass}
                id="offering-check-description"
                maxLength={OFFERING_CHECK_DESCRIPTION_MAX_LENGTH}
                name="description"
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Emails a PDF of any dashboard on a schedule"
                value={description}
              />
              <p className="font-sans text-[0.8125rem]/5 text-[#1E1E1E99] dark:text-white/50">
                The model never sees this. We only use it to grade whether its
                answer matches what you ship.
              </p>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </form>

      {invalid ? (
        <p
          className="font-sans text-[0.8125rem]/5 text-[#9B1C1C] dark:text-[#FCA5A5]"
          id="offering-check-error"
          role="alert"
        >
          {OFFERING_CHECK_INVALID_MESSAGE}
        </p>
      ) : null}

      {blocked ? (
        <p
          className="rounded-xl border border-[#1E1E1E14] bg-[#F7F5FB] px-3.5 py-2.5 font-sans text-[0.875rem]/5.5 text-[#1E1E1E] dark:border-white/10 dark:bg-white/[0.04] dark:text-white"
          role="alert"
        >
          {blocked}
        </p>
      ) : null}

      <Collapsible className="flex flex-col">
        <CollapsibleTrigger className="group inline-flex cursor-pointer items-center gap-1 self-start rounded-sm font-sans text-[0.8125rem]/5 font-medium text-[#1E1E1E99] transition-colors outline-none hover:text-[#1E1E1E] focus-visible:ring-2 focus-visible:ring-[#8B5CF6] dark:text-white/50 dark:hover:text-white">
          Try an example
          <HugeiconsIcon
            className="size-3.5 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-data-[panel-open]:rotate-180 motion-reduce:transition-none"
            icon={ArrowDown01Icon}
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="h-(--collapsible-panel-height) overflow-hidden transition-[height,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] data-[ending-style]:h-0 data-[ending-style]:opacity-0 data-[starting-style]:h-0 data-[starting-style]:opacity-0 motion-reduce:transition-none">
          <ul className="flex flex-wrap gap-2 pt-3 pb-0.5">
            {samples.map((sample) => (
              <li key={`${sample.domain}:${sample.feature}`}>
                <button
                  className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#1E1E1E14] bg-white px-2.5 py-1.5 font-sans text-[0.8125rem]/5 font-medium text-[#1E1E1E] transition-[color,border-color,scale] duration-150 ease-out hover:border-[#8B5CF6] hover:text-[#8B5CF6] active:scale-[0.96] disabled:opacity-60 motion-reduce:active:scale-100 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:hover:border-[#A78BFA] dark:hover:text-[#A78BFA]"
                  disabled={pending}
                  onClick={() => fillSample(sample)}
                  type="button"
                >
                  <OfferingFavicon
                    className="size-4 rounded"
                    domain={sample.domain}
                  />
                  {sample.feature}
                </button>
              </li>
            ))}
          </ul>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
