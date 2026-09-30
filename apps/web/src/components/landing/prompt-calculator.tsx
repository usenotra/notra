"use client";

import { ArrowRight02Icon, Link01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { CtaButton } from "@notra/ui/components/shared/cta-button";
import { cn } from "@notra/ui/lib/utils";
import { domMax, LazyMotion } from "motion/react";
import Link from "next/link";
import {
  parseAsArrayOf,
  parseAsInteger,
  parseAsStringLiteral,
  useQueryStates,
} from "nuqs";
import { type CSSProperties, Suspense, useId } from "react";

import {
  FadeText,
  RollingNumber,
  StaggeredCaption,
} from "@/components/landing/animated-text";
import { PricingProShader } from "@/components/landing/pricing-pro-shader";
import { TrackedSignupLink } from "@/components/tracked-signup-link";
import { PRICING_ICONS } from "@/constants/landing/pricing-icons";
import {
  PROMPT_CALCULATOR_ANCHOR,
  PROMPT_CALCULATOR_DEFAULT_EXTRA_LANGUAGES,
  PROMPT_CALCULATOR_DEFAULT_FREQUENCY,
  PROMPT_CALCULATOR_DEFAULT_MODELS,
  PROMPT_CALCULATOR_DEFAULT_PROMPTS,
  PROMPT_CALCULATOR_ENGINE_IDS,
  PROMPT_CALCULATOR_FREQUENCIES,
  PROMPT_CALCULATOR_HEADING,
  PROMPT_CALCULATOR_MAX_EXTRA_LANGUAGES,
  PROMPT_CALCULATOR_MAX_PROMPTS,
  PROMPT_CALCULATOR_MILESTONES,
  PROMPT_CALCULATOR_MIN_PROMPTS,
  PROMPT_CALCULATOR_SUBHEADING,
  PROMPT_CALCULATOR_TRANSLATED_PROMPTS,
} from "@/constants/landing/prompt-calculator";
import { PROMPT_CALCULATOR_ENGINES } from "@/constants/landing/prompt-calculator-engines";
import type {
  PromptCalculatorEngine,
  PromptCalculatorEngineId,
  PromptCalculatorFrequencyId,
  PromptCalculatorInput,
  PromptCalculatorPanelProps,
} from "@/types/landing/prompt-calculator";
import { copyToClipboard } from "@/utils/copy-to-clipboard";
import {
  buildPromptCalculatorSearch,
  clampPrompts,
  estimatePromptUsage,
  nearestMilestoneIndex,
  promptsToStopRatio,
  scansPerMonth,
} from "@/utils/prompt-calculator";
import { SITE_URL } from "@/utils/urls";

const numberFormat = new Intl.NumberFormat("en-US");
const NON_DIGITS = /\D/g;

const calculatorParsers = {
  prompts: parseAsInteger.withDefault(PROMPT_CALCULATOR_DEFAULT_PROMPTS),
  models: parseAsArrayOf(
    parseAsStringLiteral(PROMPT_CALCULATOR_ENGINE_IDS)
  ).withDefault(PROMPT_CALCULATOR_DEFAULT_MODELS),
  frequency: parseAsStringLiteral(
    PROMPT_CALCULATOR_FREQUENCIES.map((option) => option.id)
  ).withDefault(PROMPT_CALCULATOR_DEFAULT_FREQUENCY),
  languages: parseAsInteger.withDefault(
    PROMPT_CALCULATOR_DEFAULT_EXTRA_LANGUAGES
  ),
};

const DEFAULT_INPUT: PromptCalculatorInput = {
  prompts: PROMPT_CALCULATOR_DEFAULT_PROMPTS,
  models: PROMPT_CALCULATOR_DEFAULT_MODELS,
  frequency: PROMPT_CALCULATOR_DEFAULT_FREQUENCY,
  languages: PROMPT_CALCULATOR_DEFAULT_EXTRA_LANGUAGES,
};

/** Half the slider thumb, so the fill and dots line up with where it stops. */
const THUMB_HALF = "1rem";

// Same pill language as the MCP use-case filters.
const PILL_BASE =
  "flex shrink-0 cursor-pointer items-center gap-2 rounded-full px-4 py-1.75 font-medium font-sans text-[0.875rem] leading-[1.29] tracking-[-0.01em] outline-none transition-[color,background-color,box-shadow] duration-100 ease-out has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary";
const PILL_ACTIVE =
  "bg-[#1E1E1E] text-white [box-shadow:#1E1E1E_0_0_0_0.0625rem] dark:bg-white dark:text-[#1E1E1E] dark:[box-shadow:#FFFFFF_0_0_0_0.0625rem]";
const PILL_INACTIVE =
  "bg-white text-[#1E1E1EA6] [box-shadow:#ECECEC_0_0_0_0.0625rem] hover:text-[#1E1E1E] dark:bg-white/[0.04] dark:text-white/60 dark:[box-shadow:#FFFFFF14_0_0_0_0.0625rem] dark:hover:text-white";

const GROUP_LABEL =
  "font-sans text-[0.9375rem] font-medium tracking-[-0.015em] text-[#1E1E1E] dark:text-white";
const GROUP_META =
  "font-sans text-sm tracking-[-0.015em] text-[#1E1E1E99] tabular-nums dark:text-white/50";

function noop() {
  // The fallback renders before the URL is readable and ignores input.
}

function thumbCenter(ratio: number) {
  return `calc(${THUMB_HALF} + (100% - 2 * ${THUMB_HALF}) * ${ratio})`;
}

function EngineLogo({ engine }: { engine: PromptCalculatorEngine }) {
  const Icon = engine.icon;
  const DarkIcon = engine.darkIcon;

  return (
    <>
      <Icon
        aria-hidden="true"
        className={cn("size-4", DarkIcon && "dark:hidden")}
      />
      {DarkIcon ? (
        <DarkIcon aria-hidden="true" className="hidden size-4 dark:block" />
      ) : null}
    </>
  );
}

function PromptsPanel({ value, onChange }: PromptCalculatorPanelProps) {
  const inputId = useId();
  const ratio = promptsToStopRatio(value.prompts);
  const stopIndex = nearestMilestoneIndex(value.prompts);
  const milestone =
    PROMPT_CALCULATOR_MILESTONES[stopIndex] ?? PROMPT_CALCULATOR_MILESTONES[0];
  const lastStop = PROMPT_CALCULATOR_MILESTONES.length - 1;

  return (
    <div className="m-1.75 flex flex-col gap-5 rounded-2xl bg-white px-4.25 pt-6 pb-6 shadow-[0_0.125rem_0.3125rem_#00000008] sm:px-6 dark:bg-white/[0.04]">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-6 gap-y-1.5">
        <label
          className="font-display col-start-1 row-start-1 self-center text-[1.375rem] leading-7 font-medium tracking-[0.01em] text-black sm:self-start dark:text-white"
          htmlFor={inputId}
        >
          Prompts
        </label>
        <div className="col-start-2 row-start-1 flex items-baseline gap-2 sm:row-span-2">
          <input
            className="font-display w-[4.5ch] [appearance:textfield] rounded-lg bg-transparent text-right text-[2.625rem] leading-13 font-normal tracking-[-0.01em] text-[#1E1E1E] tabular-nums outline-none focus-visible:ring-[0.1875rem] focus-visible:ring-[#8B5CF6]/30 dark:text-white [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            id={inputId}
            inputMode="numeric"
            max={PROMPT_CALCULATOR_MAX_PROMPTS}
            min={PROMPT_CALCULATOR_MIN_PROMPTS}
            onChange={(event) => {
              const next = Number.parseInt(event.target.value, 10);
              if (!Number.isNaN(next)) {
                onChange({ prompts: clampPrompts(next) });
              }
            }}
            type="number"
            value={value.prompts}
          />
          <span className="font-sans text-sm leading-[1.125rem] tracking-[-0.015em] text-[#1E1E1EB3] dark:text-white/60">
            prompts
          </span>
        </div>
        <div
          aria-live="polite"
          className="col-span-2 row-start-2 sm:col-span-1 sm:col-start-1"
        >
          <StaggeredCaption
            className="min-h-[4.5rem] font-sans text-[0.9375rem] leading-6 tracking-[-0.015em] text-pretty text-[#1E1E1E80] min-[25rem]:min-h-12 dark:text-white/50"
            id={milestone.prompts}
            lead={milestone.name}
            leadClassName="font-medium text-[#1E1E1E] dark:text-white"
            rest={milestone.detail}
          />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="relative h-10 rounded-full bg-[#F1F1F2] p-1 shadow-[inset_0_0.0625rem_0.125rem_#1E1E1E0F] dark:bg-white/[0.06]">
          <div className="relative h-full">
            <input
              aria-label="Prompts"
              aria-valuetext={`${milestone.name}, ${milestone.label} prompts`}
              className="peer absolute inset-0 z-10 h-full w-full cursor-pointer appearance-none opacity-0 [&::-moz-range-thumb]:size-8 [&::-webkit-slider-thumb]:size-8 [&::-webkit-slider-thumb]:appearance-none"
              max={lastStop}
              min={0}
              onChange={(event) => {
                const next =
                  PROMPT_CALCULATOR_MILESTONES[Number(event.target.value)];
                if (next) {
                  onChange({ prompts: next.prompts });
                }
              }}
              step={1}
              type="range"
              value={stopIndex}
            />

            {PROMPT_CALCULATOR_MILESTONES.map((stop, index) => {
              const stopRatio = index / lastStop;

              return stopRatio > ratio ? (
                <span
                  aria-hidden="true"
                  className="absolute top-1/2 left-(--stop) size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#1E1E1E33] dark:bg-white/30"
                  key={stop.prompts}
                  style={{ "--stop": thumbCenter(stopRatio) } as CSSProperties}
                />
              ) : null;
            })}

            <div
              aria-hidden="true"
              className="absolute inset-y-0 left-0 w-[calc(var(--thumb)+1rem)] overflow-hidden rounded-full bg-[linear-gradient(180deg,#8B5CF6,#7C3AED)] shadow-[inset_0_0.0625rem_0_#FFFFFF33] transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
              style={{ "--thumb": thumbCenter(ratio) } as CSSProperties}
            >
              <span className="absolute inset-0 bg-[radial-gradient(circle,#FFFFFF2E_0.75px,transparent_1.25px)] bg-size-[0.375rem_0.375rem]" />
              <span
                className="absolute inset-0 animate-[promptSliderSweep_900ms_ease-out_forwards] bg-[radial-gradient(circle,#FFFFFFE6_0.9px,transparent_1.4px)] [mask-image:linear-gradient(90deg,transparent,#000_50%,transparent)] bg-size-[0.375rem_0.375rem] [mask-size:30%_100%] [mask-position:-60%_0] [mask-repeat:no-repeat] motion-reduce:hidden"
                key={value.prompts}
              />
            </div>

            <span
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-(--thumb) size-8 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[linear-gradient(180deg,#FFFFFF,#F2F2F2)] shadow-[0_0.0625rem_0.25rem_#28282840,0_0_0_0.0625rem_#1E1E1E0D] transition-[left,scale] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] peer-focus-visible:ring-[0.1875rem] peer-focus-visible:ring-[#8B5CF6]/40 peer-active:scale-[0.96] motion-reduce:transition-none"
              style={{ "--thumb": thumbCenter(ratio) } as CSSProperties}
            />
          </div>
        </div>

        <div className="relative mx-1 h-4 font-sans text-xs tracking-[-0.01em] text-[#1E1E1E80] tabular-nums dark:text-white/45">
          {PROMPT_CALCULATOR_MILESTONES.map((stop, index) => (
            <button
              className={cn(
                "absolute top-0 left-(--stop) -translate-x-1/2 cursor-pointer transition-colors duration-100 hover:text-[#1E1E1E] dark:hover:text-white",
                stop.prompts === value.prompts &&
                  "font-medium text-[#1E1E1E] dark:text-white"
              )}
              key={stop.prompts}
              onClick={() => onChange({ prompts: stop.prompts })}
              style={
                { "--stop": thumbCenter(index / lastStop) } as CSSProperties
              }
              tabIndex={-1}
              type="button"
            >
              {stop.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ModelPills({ value, onChange }: PromptCalculatorPanelProps) {
  function toggle(id: PromptCalculatorEngineId) {
    if (value.models.includes(id)) {
      if (value.models.length > 1) {
        onChange({ models: value.models.filter((model) => model !== id) });
      }
      return;
    }
    onChange({
      models: PROMPT_CALCULATOR_ENGINE_IDS.filter(
        (model) => model === id || value.models.includes(model)
      ),
    });
  }

  return (
    <fieldset className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <legend className={GROUP_LABEL}>Models</legend>
        <span className={GROUP_META}>
          {value.models.length} of {PROMPT_CALCULATOR_ENGINES.length}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {PROMPT_CALCULATOR_ENGINES.map((engine) => {
          const checked = value.models.includes(engine.id);

          return (
            <label
              className={cn(PILL_BASE, checked ? PILL_ACTIVE : PILL_INACTIVE)}
              key={engine.id}
            >
              <input
                checked={checked}
                className="sr-only"
                disabled={checked && value.models.length === 1}
                onChange={() => toggle(engine.id)}
                type="checkbox"
              />
              <span
                className={cn(
                  "flex size-5 items-center justify-center rounded-full",
                  checked && "bg-white dark:bg-[#1E1E1E]/10"
                )}
              >
                <EngineLogo engine={engine} />
              </span>
              {engine.name}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function LanguagePills({ value, onChange }: PromptCalculatorPanelProps) {
  const name = useId();
  const translated = Math.min(
    value.prompts,
    PROMPT_CALCULATOR_TRANSLATED_PROMPTS
  );

  return (
    <fieldset className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <legend className={GROUP_LABEL}>Extra languages</legend>
        <span className={GROUP_META}>
          {value.languages === 0
            ? "English only"
            : `+${numberFormat.format(translated * value.languages)} prompt runs`}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {Array.from(
          { length: PROMPT_CALCULATOR_MAX_EXTRA_LANGUAGES + 1 },
          (_, count) => {
            const checked = count === value.languages;

            return (
              <label
                className={cn(PILL_BASE, checked ? PILL_ACTIVE : PILL_INACTIVE)}
                key={count}
              >
                <input
                  checked={checked}
                  className="sr-only"
                  name={name}
                  onChange={() => onChange({ languages: count })}
                  type="radio"
                  value={count}
                />
                {count === 0 ? "None" : `+${count}`}
              </label>
            );
          }
        )}
      </div>
      <p className="font-sans text-[0.8125rem] leading-5 tracking-[-0.01em] text-[#1E1E1E80] dark:text-white/45">
        Each extra language re-runs your first{" "}
        {PROMPT_CALCULATOR_TRANSLATED_PROMPTS} prompts in that language.
      </p>
    </fieldset>
  );
}

function FrequencyPills({ value, onChange }: PromptCalculatorPanelProps) {
  const name = useId();
  const scans = Math.round(scansPerMonth(value.frequency) * 10) / 10;

  return (
    <fieldset className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <legend className={GROUP_LABEL}>Scan frequency</legend>
        <span className={GROUP_META}>
          {scans} {scans === 1 ? "scan" : "scans"} / month
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {PROMPT_CALCULATOR_FREQUENCIES.map((option) => {
          const id = option.id as PromptCalculatorFrequencyId;
          const checked = id === value.frequency;

          return (
            <label
              className={cn(PILL_BASE, checked ? PILL_ACTIVE : PILL_INACTIVE)}
              key={id}
            >
              <input
                checked={checked}
                className="sr-only"
                name={name}
                onChange={() => onChange({ frequency: id })}
                type="radio"
                value={id}
              />
              {option.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function EstimateCard({ value }: Pick<PromptCalculatorPanelProps, "value">) {
  const estimate = estimatePromptUsage(value);
  const { plan } = estimate;
  const isEnterprise = estimate.usage === null;
  const scans = Math.round(estimate.scansPerMonth * 10) / 10;
  const TrackingIcon = PRICING_ICONS.tracking;
  const ProjectsIcon = PRICING_ICONS.projects;

  let headroom = "Past the largest plan, sized with you";
  if (!isEnterprise) {
    headroom =
      estimate.promptHeadroom === 0
        ? "Right at the plan limit"
        : `Room for ${numberFormat.format(estimate.promptHeadroom ?? 0)} more prompts`;
  }

  const ctaLink =
    plan.cta.kind === "signup" ? (
      <TrackedSignupLink
        href={plan.cta.href}
        source={`pricing_calculator_${plan.id}`}
      />
    ) : (
      <Link href={plan.cta.href} />
    );

  function copyLink() {
    copyToClipboard(
      `${SITE_URL}/pricing${buildPromptCalculatorSearch(value)}`,
      "Link to this estimate copied"
    );
  }

  return (
    <article className="relative flex flex-col overflow-clip rounded-3xl bg-[#8B5CF6]">
      {/* Flipped to the top so the dither sits behind the glass header, not the breakdown. */}
      <div className="pointer-events-none absolute inset-0 -scale-y-100 opacity-60">
        <PricingProShader />
      </div>

      <div className="relative z-10 flex h-full flex-col">
        <div className="m-1.75 flex flex-col gap-2 rounded-2xl border border-white/5 bg-white/10 px-4.25 py-6 shadow-[inset_0_0_1.29375rem_#FFFFFF1A]">
          <div className="flex items-center justify-between gap-2">
            <h3
              aria-live="polite"
              className="font-display text-[1.375rem] leading-7 font-semibold tracking-[0.01em] text-white"
            >
              <FadeText text={plan.name} />
            </h3>
            <span className="rounded-full bg-white/20 px-2 py-1 font-sans text-[0.8125rem] leading-[1.125rem] font-medium text-white outline -outline-offset-1 outline-[#F6F8FA80]">
              Recommended
            </span>
          </div>
          <p className="line-clamp-2 min-h-[2.25rem] font-sans text-[0.9375rem] leading-[1.125rem] tracking-[-0.015em] text-white/70">
            <FadeText text={plan.description} wrap />
          </p>
        </div>

        <div className="flex flex-1 flex-col px-6 pt-4.5 pb-6">
          <div className="flex flex-col items-start gap-3.25">
            <div className="flex items-baseline gap-2">
              <span className="font-display text-[2.625rem] leading-13 font-normal tracking-[-0.01em] text-white tabular-nums">
                {isEnterprise ? (
                  <FadeText text={plan.price.monthly} />
                ) : (
                  <RollingNumber
                    numeric={Number(plan.price.monthly.replace(NON_DIGITS, ""))}
                    value={plan.price.monthly}
                  />
                )}
              </span>
              {plan.priceSuffix ? (
                <span className="font-sans text-sm leading-[1.125rem] tracking-[-0.015em] text-white/70">
                  {plan.priceSuffix.monthly}
                </span>
              ) : null}
            </div>
            <CtaButton
              className="w-full"
              nativeButton={false}
              render={ctaLink}
              variant="light"
            >
              <span>
                {isEnterprise ? plan.cta.label : `Start with ${plan.name}`}
              </span>
              {plan.cta.showArrow ? (
                <HugeiconsIcon className="size-4" icon={ArrowRight02Icon} />
              ) : null}
            </CtaButton>
            <button
              className="-mt-1 flex h-8 cursor-pointer items-center justify-center gap-1.5 self-center rounded-full px-3 font-sans text-sm text-white/80 transition-[color,scale] duration-100 outline-none hover:text-white focus-visible:ring-2 focus-visible:ring-white/60 active:scale-[0.96]"
              onClick={copyLink}
              type="button"
            >
              <HugeiconsIcon className="size-4" icon={Link01Icon} />
              Copy link to this estimate
            </button>
          </div>

          <div className="mt-6 h-px w-full bg-white/20" />

          <ul className="mt-8 flex flex-col gap-3">
            <li className="flex items-center gap-2">
              <TrackingIcon className="size-6 shrink-0 text-white" />
              <div className="flex flex-col">
                <span className="font-sans text-sm leading-[1.125rem] text-white tabular-nums">
                  <RollingNumber
                    numeric={estimate.answersPerMonth}
                    value={numberFormat.format(estimate.answersPerMonth)}
                  />{" "}
                  AI answers / mo
                </span>
                <span className="min-h-8 font-sans text-xs leading-4 text-white/90 tabular-nums min-[25rem]:min-h-4">
                  {numberFormat.format(estimate.promptRuns)}{" "}
                  {value.languages > 0 ? "prompt runs" : "prompts"} ×{" "}
                  {value.models.length} models × {scans} scans
                </span>
              </div>
            </li>
            <li className="flex items-center gap-2">
              <ProjectsIcon className="size-6 shrink-0 text-white" />
              <div className="flex flex-col">
                <span className="font-sans text-sm leading-[1.125rem] text-white tabular-nums">
                  <FadeText
                    text={
                      plan.answersPerMonth === null
                        ? "Custom answer quota"
                        : `${numberFormat.format(plan.answersPerMonth)} included`
                    }
                  />
                </span>
                <span className="min-h-8 font-sans text-xs leading-4 text-white/90 tabular-nums min-[25rem]:min-h-4">
                  <FadeText text={headroom} />
                </span>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </article>
  );
}

function PromptCalculatorPanel({
  value,
  onChange,
}: PromptCalculatorPanelProps) {
  return (
    <div className="grid w-full max-w-96 grid-cols-1 gap-4 sm:max-w-[40rem] lg:max-w-[80rem] lg:grid-cols-[minmax(0,1fr)_24rem]">
      <div className="flex flex-col rounded-3xl bg-[#F7F7F7] dark:bg-white/[0.04]">
        <PromptsPanel onChange={onChange} value={value} />
        <div className="flex flex-col gap-7 px-6 pt-5 pb-7">
          <ModelPills onChange={onChange} value={value} />
          <FrequencyPills onChange={onChange} value={value} />
          <LanguagePills onChange={onChange} value={value} />
        </div>
      </div>
      <EstimateCard value={value} />
    </div>
  );
}

function UrlBoundPromptCalculator() {
  const [value, setValue] = useQueryStates(calculatorParsers, {
    clearOnDefault: true,
    history: "replace",
    scroll: false,
  });

  const normalized: PromptCalculatorInput = {
    prompts: clampPrompts(value.prompts),
    models:
      value.models.length > 0 ? value.models : PROMPT_CALCULATOR_DEFAULT_MODELS,
    frequency: value.frequency,
    languages: Math.min(
      PROMPT_CALCULATOR_MAX_EXTRA_LANGUAGES,
      Math.max(0, value.languages)
    ),
  };

  return <PromptCalculatorPanel onChange={setValue} value={normalized} />;
}

export function PromptCalculatorSection() {
  return (
    <LazyMotion features={domMax}>
      <section
        className="flex w-full scroll-mt-24 flex-col items-center gap-13.5 px-6 pb-24"
        id={PROMPT_CALCULATOR_ANCHOR}
      >
        <div className="flex flex-col items-center gap-6">
          <h2 className="font-display max-w-[59rem] text-center text-[2rem] leading-[1.12] font-medium tracking-[-0.02em] text-balance text-[#1E1E1E] sm:text-[2.875rem] sm:leading-13 dark:text-white">
            {PROMPT_CALCULATOR_HEADING}
          </h2>
          <p className="max-w-[43rem] text-center font-sans text-lg leading-7 font-medium text-balance text-[#1E1E1EBF] sm:text-xl dark:text-white/70">
            {PROMPT_CALCULATOR_SUBHEADING}
          </p>
        </div>

        <Suspense
          fallback={
            <PromptCalculatorPanel onChange={noop} value={DEFAULT_INPUT} />
          }
        >
          <UrlBoundPromptCalculator />
        </Suspense>
      </section>
    </LazyMotion>
  );
}
