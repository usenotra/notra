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
import { type FormEvent, useEffect, useRef, useState } from "react";

import {
  OFFERING_CHECK_DESCRIPTION_MAX_LENGTH,
  OFFERING_CHECK_FEATURE_MAX_LENGTH,
  OFFERING_CHECK_INVALID_MESSAGE,
  OFFERING_CHECK_PREFLIGHT_PATH,
  OFFERING_REPORT_FAILURE_MESSAGES,
  OFFERING_FAVICON_SETTLE_MS,
  OFFERING_SAMPLE_TYPE_MS,
} from "@/constants/offering-check";
import { offeringCheckRequestSchema } from "@/schemas/offering-check";
import type {
  OfferingCheckFormProps,
  OfferingCheckInput,
  OfferingSentenceFieldProps,
} from "@/types/offering-check";
import { normalizeDomain } from "@/utils/offering-check";
import {
  offeringReportHref,
  storeOfferingReportDescription,
} from "@/utils/offering-report";
import { getReducedMotionSnapshot } from "@/utils/reduced-motion";

import { OfferingFavicon } from "./offering-favicon";

const SWAP_CLASS =
  "transition-[opacity,scale,filter] duration-300 ease-[cubic-bezier(0.2,0,0,1)] [grid-area:1/1] motion-reduce:transition-none";
const SWAP_HIDDEN = "scale-25 opacity-0 blur-[4px]";
const REVEAL_CLASS =
  "h-(--collapsible-panel-height) overflow-hidden transition-[height,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] data-[ending-style]:h-0 data-[ending-style]:opacity-0 data-[starting-style]:h-0 data-[starting-style]:opacity-0 motion-reduce:transition-none";

function SentenceField({
  id,
  label,
  leading,
  invalid,
  className,
  ...props
}: OfferingSentenceFieldProps) {
  return (
    <span
      className={cn(
        "group/field relative inline-flex max-w-full items-baseline gap-2 rounded-xl px-1 align-baseline transition-[background-color] duration-200 focus-within:bg-[#8B5CF614] hover:bg-[#8B5CF60D] dark:focus-within:bg-[#A78BFA1F] dark:hover:bg-[#A78BFA14]",
        className
      )}
    >
      <label className="sr-only" htmlFor={id}>
        {label}
      </label>
      {leading}
      <input
        aria-describedby={invalid ? "offering-check-error" : undefined}
        aria-invalid={invalid}
        className="[field-sizing:content] max-w-full min-w-[4ch] bg-transparent p-0 leading-[inherit] text-[#8B5CF6] caret-[#8B5CF6] outline-none placeholder:text-[#8B5CF659] dark:text-[#A78BFA] dark:placeholder:text-[#A78BFA59]"
        id={id}
        size={Math.max(
          String(props.value ?? "").length,
          props.placeholder?.length ?? 0,
          4
        )}
        {...props}
      />
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-x-1 bottom-0.5 h-0.5 rounded-full transition-colors duration-200",
          invalid
            ? "bg-[#DC2626]"
            : "bg-[#8B5CF63D] group-focus-within/field:bg-[#8B5CF6] dark:bg-[#A78BFA40] dark:group-focus-within/field:bg-[#A78BFA]"
        )}
      />
    </span>
  );
}

export function OfferingCheckForm({ samples }: OfferingCheckFormProps) {
  const navigate = useNavigate();
  const [domain, setDomain] = useState("");
  const [feature, setFeature] = useState("");
  const [description, setDescription] = useState("");
  const [invalid, setInvalid] = useState(false);
  const [blocked, setBlocked] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const typing = useRef<ReturnType<typeof setInterval> | null>(null);
  const [settledDomain, setSettledDomain] = useState<string | null>(null);

  // Waits for a pause in typing so the favicon does not flicker per keystroke.
  useEffect(() => {
    const timer = setTimeout(
      () => setSettledDomain(normalizeDomain(domain)),
      OFFERING_FAVICON_SETTLE_MS
    );
    return () => clearTimeout(timer);
  }, [domain]);

  useEffect(
    () => () => {
      if (typing.current) {
        clearInterval(typing.current);
      }
    },
    []
  );

  const openReport = async (input: OfferingCheckInput) => {
    setBlocked(null);
    setPending(true);
    const response = await fetch(OFFERING_CHECK_PREFLIGHT_PATH, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }).catch(() => null);
    if (!response?.ok) {
      const reason =
        {
          429: OFFERING_REPORT_FAILURE_MESSAGES["rate-limited"],
          503: OFFERING_REPORT_FAILURE_MESSAGES.unavailable,
        }[response?.status ?? 0] ?? OFFERING_REPORT_FAILURE_MESSAGES.error;
      setBlocked(reason);
      setPending(false);
      return;
    }
    storeOfferingReportDescription(input);
    await navigate({ href: offeringReportHref(input) });
  };

  // Types the sample in so the sentence visibly fills itself.
  const fillSample = (sample: OfferingCheckInput) => {
    if (typing.current) {
      clearInterval(typing.current);
    }
    setInvalid(false);
    setBlocked(null);
    setDescription(sample.description);
    if (getReducedMotionSnapshot()) {
      setDomain(sample.domain);
      setFeature(sample.feature);
      return;
    }
    const total = sample.domain.length + sample.feature.length;
    let typed = 0;
    setDomain("");
    setFeature("");
    typing.current = setInterval(() => {
      typed += 1;
      setDomain(sample.domain.slice(0, typed));
      setFeature(
        sample.feature.slice(0, Math.max(0, typed - sample.domain.length))
      );
      if (typed >= total && typing.current) {
        clearInterval(typing.current);
        typing.current = null;
      }
    }, OFFERING_SAMPLE_TYPE_MS);
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
    <form className="flex flex-col" onSubmit={handleSubmit}>
      <p className="font-display text-foreground text-[1.75rem]/[1.55] font-medium tracking-[-0.02em] text-pretty sm:text-[2.25rem]/[1.5]">
        Does AI know{" "}
        <SentenceField
          autoCapitalize="none"
          autoComplete="url"
          id="offering-check-domain"
          inputMode="url"
          invalid={invalid}
          label="Your website"
          leading={
            <span
              className={cn(
                "grid shrink-0 self-center transition-[width,opacity,scale,filter] duration-300 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none",
                settledDomain
                  ? "w-7 opacity-100"
                  : "w-0 scale-50 opacity-0 blur-[2px]"
              )}
            >
              {settledDomain ? (
                <OfferingFavicon
                  className="size-7 rounded-lg"
                  domain={settledDomain}
                  key={settledDomain}
                />
              ) : null}
            </span>
          }
          name="domain"
          onChange={(event) => {
            setDomain(event.target.value);
            setInvalid(false);
          }}
          placeholder="acme.com"
          spellCheck={false}
          value={domain}
        />{" "}
        and{" "}
        <SentenceField
          autoComplete="off"
          id="offering-check-feature"
          invalid={false}
          label="Feature name, optional"
          maxLength={OFFERING_CHECK_FEATURE_MAX_LENGTH}
          name="feature"
          onChange={(event) => {
            setFeature(event.target.value);
            setInvalid(false);
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

      {invalid || blocked ? (
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
          {invalid ? OFFERING_CHECK_INVALID_MESSAGE : blocked}
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
