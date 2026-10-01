"use client";

import {
  ArrowDown01Icon,
  ArrowLeft02Icon,
  ArrowRight02Icon,
  Link01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { CtaButton } from "@notra/ui/components/shared/cta-button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@notra/ui/components/ui/dropdown-menu";
import { StepSlider } from "@notra/ui/components/ui/step-slider";
import { cn } from "@notra/ui/lib/utils";
import { domMax, LazyMotion } from "motion/react";
import Link from "next/link";
import {
  parseAsArrayOf,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
  useQueryStates,
} from "nuqs";
import {
  Suspense,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

import {
  FadeText,
  RollingNumber,
  StaggeredCaption,
} from "@/components/landing/animated-text";
import { PricingProShader } from "@/components/landing/pricing-pro-shader";
import { TrackedSignupLink } from "@/components/tracked-signup-link";
import { PRICING_ANNUAL_BADGE } from "@/constants/landing/pricing";
import { PRICING_ICONS } from "@/constants/landing/pricing-icons";
import {
  PROMPT_CALCULATOR_ANCHOR,
  PROMPT_CALCULATOR_DEFAULT_FREQUENCY,
  PROMPT_CALCULATOR_DEFAULT_MODELS,
  PROMPT_CALCULATOR_DEFAULT_PROMPTS,
  PROMPT_CALCULATOR_FREQUENCIES,
  PROMPT_CALCULATOR_HEADING,
  PROMPT_CALCULATOR_MAX_PROMPTS,
  PROMPT_CALCULATOR_MILESTONES,
  PROMPT_CALCULATOR_STOPS,
  PROMPT_CALCULATOR_MIN_PROMPTS,
  PROMPT_CALCULATOR_SUBHEADING,
} from "@/constants/landing/prompt-calculator";
import {
  PROMPT_CALCULATOR_ENGINES,
  PROMPT_CALCULATOR_MODEL_IDS,
} from "@/constants/landing/prompt-calculator-engines";
import type { PricingPlan } from "@/types/landing/pricing";
import type {
  PromptCalculatorEngine,
  PromptCalculatorEstimate,
  PromptCalculatorFrequencyId,
  PromptCalculatorInput,
  PromptCalculatorPanelProps,
} from "@/types/landing/prompt-calculator";
import { copyToClipboard } from "@/utils/copy-to-clipboard";
import {
  buildPromptCalculatorSearch,
  clampPrompts,
  estimatePromptUsage,
  findFittingCadence,
  milestoneFor,
  normalizeModelIds,
  promptsToStopRatio,
  scansPerMonth,
} from "@/utils/prompt-calculator";
import { SITE_URL } from "@/utils/urls";

const numberFormat = new Intl.NumberFormat("en-US");
const NON_DIGITS = /\D/g;

const calculatorParsers = {
  prompts: parseAsInteger.withDefault(PROMPT_CALCULATOR_DEFAULT_PROMPTS),
  models: parseAsArrayOf(parseAsString).withDefault(
    PROMPT_CALCULATOR_DEFAULT_MODELS
  ),
  frequency: parseAsStringLiteral(
    PROMPT_CALCULATOR_FREQUENCIES.map((option) => option.id)
  ).withDefault(PROMPT_CALCULATOR_DEFAULT_FREQUENCY),
};

const DEFAULT_INPUT: PromptCalculatorInput = {
  prompts: PROMPT_CALCULATOR_DEFAULT_PROMPTS,
  models: PROMPT_CALCULATOR_DEFAULT_MODELS,
  frequency: PROMPT_CALCULATOR_DEFAULT_FREQUENCY,
};

const THOUSAND = 1000;
const LAST_STOP_INDEX = PROMPT_CALCULATOR_STOPS.length - 1;
/** Stops whose label stays visible when the slider is narrow. */
const MAJOR_STOPS = PROMPT_CALCULATOR_MILESTONES.map((entry) => entry.prompts);

function formatStopLabel(stop: number) {
  return stop >= THOUSAND ? `${stop / THOUSAND}K` : stop;
}

// Same pill language as the MCP use-case filters.
const PILL_BASE =
  "flex shrink-0 cursor-pointer items-center gap-2 rounded-full px-4 py-1.75 font-medium font-sans text-[0.875rem] leading-[1.29] tracking-[-0.01em] outline-none transition-[color,background-color,box-shadow] duration-100 ease-out has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary";
const PILL_ACTIVE =
  "bg-[#1E1E1E] text-white [box-shadow:#1E1E1E_0_0_0_0.0625rem] dark:bg-white dark:text-[#1E1E1E] dark:[box-shadow:#FFFFFF_0_0_0_0.0625rem]";
const PILL_INACTIVE =
  "bg-white text-[#1E1E1EA6] [box-shadow:#ECECEC_0_0_0_0.0625rem] hover:text-[#1E1E1E] dark:bg-white/[0.04] dark:text-white/60 dark:[box-shadow:#FFFFFF14_0_0_0_0.0625rem] dark:hover:text-white";

/** Logos the mobile engine field shows before collapsing the rest into "+N". */
const MAX_STACKED_LOGOS = 3;

/** A full-width select-style field for the compact mobile controls. */
const MOBILE_FIELD =
  "flex h-11 w-full cursor-pointer items-center gap-2.5 rounded-xl bg-white px-3.5 text-left font-sans text-[0.9375rem] font-medium tracking-[-0.01em] text-[#1E1E1E] outline-none [box-shadow:#ECECEC_0_0_0_0.0625rem] focus-visible:ring-2 focus-visible:ring-primary dark:bg-white/[0.04] dark:text-white dark:[box-shadow:#FFFFFF14_0_0_0_0.0625rem]";

const GROUP_LABEL =
  "font-sans text-[0.9375rem] font-medium tracking-[-0.015em] text-[#1E1E1E] dark:text-white";
const GROUP_META =
  "font-sans text-sm tracking-[-0.015em] text-[#1E1E1E99] tabular-nums dark:text-white/50";

function noop() {
  // The fallback renders before the URL is readable and ignores input.
}

/**
 * `onDarkPill` picks the light mark for monochrome logos. Selected pills turn
 * white in dark mode, so they keep the default (dark) mark in both themes.
 */
function EngineLogo({
  engine,
  onDarkPill,
}: {
  engine: PromptCalculatorEngine;
  onDarkPill: boolean;
}) {
  const Icon = engine.icon;
  const DarkIcon = engine.darkIcon;
  const swapInDark = onDarkPill && DarkIcon;

  return (
    <>
      <Icon
        aria-hidden="true"
        className={cn("size-4", swapInDark && "dark:hidden")}
      />
      {swapInDark ? (
        <DarkIcon aria-hidden="true" className="hidden size-4 dark:block" />
      ) : null}
    </>
  );
}

function PromptsPanel({ value, onChange }: PromptCalculatorPanelProps) {
  const inputId = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const milestone = milestoneFor(value.prompts);

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
            onBlur={() => setDraft(null)}
            onChange={(event) => {
              // Keep what the visitor types (even an empty field) until they
              // leave it; only valid numbers reach the estimate.
              setDraft(event.target.value);
              const next = Number.parseInt(event.target.value, 10);
              if (!Number.isNaN(next)) {
                onChange({ prompts: clampPrompts(next) });
              }
            }}
            type="number"
            value={draft ?? value.prompts}
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

      <StepSlider
        aria-label="Prompts"
        formatLabel={formatStopLabel}
        getValueText={(prompts) =>
          `${numberFormat.format(prompts)} prompts, ${milestoneFor(prompts).name}`
        }
        majorSteps={MAJOR_STOPS}
        onValueChange={(prompts) => onChange({ prompts })}
        positionOf={(prompts) => promptsToStopRatio(prompts) * LAST_STOP_INDEX}
        steps={PROMPT_CALCULATOR_STOPS}
        value={value.prompts}
      />
    </div>
  );
}

const MORE_ENGINE_COUNT = PROMPT_CALCULATOR_ENGINES.filter(
  (engine) => !engine.featured
).length;
/** Distance from either end, in px, under which the strip counts as at that end. */
const STRIP_EDGE_PX = 4;
/** Width of the fade at a scrollable edge of the engine strip. */
const STRIP_FADE_PX = 48;

/** Phones get one select-style field instead of a row of pills. */
function EngineDropdown({
  value,
  selectedModels,
  onToggleEngine,
}: {
  value: PromptCalculatorInput;
  selectedModels: ReadonlySet<string>;
  onToggleEngine: (engine: PromptCalculatorEngine) => void;
}) {
  const selectedEngines = PROMPT_CALCULATOR_ENGINES.filter((engine) =>
    engine.models.some((model) => selectedModels.has(model.id))
  );
  // From four engines on, the mobile field shows three logos and a "+N".
  const stackedEngines =
    selectedEngines.length > MAX_STACKED_LOGOS
      ? selectedEngines.slice(0, MAX_STACKED_LOGOS)
      : selectedEngines;
  const hiddenEngineCount = selectedEngines.length - stackedEngines.length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button className={cn(MOBILE_FIELD, "sm:hidden")} type="button" />
        }
      >
        <span className="flex shrink-0 -space-x-1.5">
          {stackedEngines.map((engine) => (
            <span
              className="flex size-6 items-center justify-center rounded-full bg-white shadow-[0_0_0_0.125rem_#FFFFFF,0_0_0_0.1875rem_#1E1E1E14] dark:bg-[#2a2a2a] dark:shadow-[0_0_0_0.125rem_#1E1E1E]"
              key={engine.id}
            >
              <EngineLogo engine={engine} onDarkPill />
            </span>
          ))}
          {hiddenEngineCount > 0 ? (
            <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-[#F4F4F5] px-1.5 font-sans text-[0.6875rem] font-medium text-[#1E1E1E] tabular-nums shadow-[0_0_0_0.125rem_#FFFFFF,0_0_0_0.1875rem_#1E1E1E14] dark:bg-[#2a2a2a] dark:text-white dark:shadow-[0_0_0_0.125rem_#1E1E1E]">
              +{hiddenEngineCount}
            </span>
          ) : null}
        </span>
        <span className="min-w-0 flex-1 truncate">
          {selectedEngines.map((engine) => engine.name).join(", ")}
        </span>
        <HugeiconsIcon
          aria-hidden="true"
          className="size-4 shrink-0 text-[#1E1E1E80] dark:text-white/50"
          icon={ArrowDown01Icon}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {PROMPT_CALCULATOR_ENGINES.map((engine) => {
          const selectedCount = engine.models.filter((model) =>
            selectedModels.has(model.id)
          ).length;

          return (
            <DropdownMenuCheckboxItem
              checked={selectedCount > 0}
              disabled={
                selectedCount > 0 && selectedCount === value.models.length
              }
              key={engine.id}
              onCheckedChange={() => onToggleEngine(engine)}
            >
              <EngineLogo engine={engine} onDarkPill />
              {engine.name}
              {selectedCount > 1 ? (
                <span className="text-muted-foreground tabular-nums">
                  · {selectedCount}
                </span>
              ) : null}
            </DropdownMenuCheckboxItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** The scrollable engine pills, from the sm breakpoint up. */
function EngineStrip({
  value,
  selectedModels,
  onToggleEngine,
}: {
  value: PromptCalculatorInput;
  selectedModels: ReadonlySet<string>;
  onToggleEngine: (engine: PromptCalculatorEngine) => void;
}) {
  const stripRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ atStart: true, atEnd: false });

  const updateEdges = useCallback(() => {
    const strip = stripRef.current;
    if (!strip) {
      return;
    }
    const maxScroll = strip.scrollWidth - strip.clientWidth;
    // The fades grow with the distance to each end, so they ease in and out
    // while scrolling instead of switching on and off.
    strip.style.setProperty(
      "--fade-start",
      `${Math.min(strip.scrollLeft, STRIP_FADE_PX)}px`
    );
    strip.style.setProperty(
      "--fade-end",
      `${Math.min(Math.max(maxScroll - strip.scrollLeft, 0), STRIP_FADE_PX)}px`
    );
    const atStart = strip.scrollLeft <= STRIP_EDGE_PX;
    const atEnd = strip.scrollLeft >= maxScroll - STRIP_EDGE_PX;
    setEdges((current) =>
      current.atStart === atStart && current.atEnd === atEnd
        ? current
        : { atStart, atEnd }
    );
  }, []);

  useEffect(() => {
    updateEdges();
    const strip = stripRef.current;
    if (!strip) {
      return;
    }
    const observer = new ResizeObserver(updateEdges);
    observer.observe(strip);
    return () => observer.disconnect();
  }, [updateEdges]);

  const canScroll = !(edges.atStart && edges.atEnd);

  function scrollStrip() {
    const strip = stripRef.current;
    if (!strip) {
      return;
    }
    strip.scrollTo({
      left: edges.atEnd ? 0 : strip.scrollWidth,
      behavior: "smooth",
    });
  }

  return (
    <div className="hidden items-center gap-2 sm:flex">
      <div
        className="relative -my-1 flex min-w-0 flex-1 [scrollbar-width:none] gap-2 overflow-x-auto [mask-image:linear-gradient(to_right,transparent,#000_var(--fade-start,0px),#000_calc(100%-var(--fade-end,0px)),transparent)] py-1 [&::-webkit-scrollbar]:hidden"
        onScroll={updateEdges}
        ref={stripRef}
      >
        {PROMPT_CALCULATOR_ENGINES.map((engine) => {
          const selectedCount = engine.models.filter((model) =>
            selectedModels.has(model.id)
          ).length;
          const checked = selectedCount > 0;

          return (
            <label
              className={cn(
                PILL_BASE,
                "first:ml-px last:mr-px",
                checked ? PILL_ACTIVE : PILL_INACTIVE
              )}
              key={engine.id}
            >
              <input
                checked={checked}
                className="sr-only"
                disabled={checked && selectedCount === value.models.length}
                onChange={() => onToggleEngine(engine)}
                type="checkbox"
              />
              <span
                className={cn(
                  "flex size-5 items-center justify-center rounded-full",
                  checked && "bg-white dark:bg-[#1E1E1E]/10"
                )}
              >
                <EngineLogo engine={engine} onDarkPill={!checked} />
              </span>
              {engine.name}
              {/* Stays mounted and eases its width, so the pill grows
                    smoothly when a second model of the engine is picked. The
                    negative margin cancels the pill gap while collapsed. */}
              <span
                aria-hidden={selectedCount < 2}
                className={cn(
                  "-ml-2 inline-grid transition-[grid-template-columns,opacity] duration-200 ease-out motion-reduce:transition-none",
                  selectedCount > 1
                    ? "grid-cols-[1fr] opacity-60"
                    : "grid-cols-[0fr] opacity-0"
                )}
              >
                <span className="overflow-hidden pl-2 whitespace-nowrap tabular-nums">
                  ·{" "}
                  <RollingNumber
                    numeric={Math.max(selectedCount, 2)}
                    value={String(Math.max(selectedCount, 2))}
                  />
                </span>
              </span>
            </label>
          );
        })}
      </div>
      {canScroll ? (
        <button
          aria-label={
            edges.atEnd ? "Back to the first models" : "See more models"
          }
          className={cn(
            PILL_BASE,
            PILL_INACTIVE,
            "focus-visible:ring-primary grid focus-visible:ring-2"
          )}
          onClick={scrollStrip}
          type="button"
        >
          {/* Both labels share one cell so the button never changes width. */}
          <span
            aria-hidden="true"
            className={cn(
              "col-start-1 row-start-1 flex items-center justify-center gap-1.5 transition-opacity duration-200",
              edges.atEnd ? "opacity-0" : "opacity-100"
            )}
          >
            See {MORE_ENGINE_COUNT} more
            <HugeiconsIcon className="size-3.5" icon={ArrowRight02Icon} />
          </span>
          <span
            aria-hidden="true"
            className={cn(
              "col-start-1 row-start-1 flex items-center justify-center gap-1.5 transition-opacity duration-200",
              edges.atEnd ? "opacity-100" : "opacity-0"
            )}
          >
            <HugeiconsIcon className="size-3.5" icon={ArrowLeft02Icon} />
            Back
          </span>
        </button>
      ) : null}
    </div>
  );
}

/** A disclosure listing every current model per engine. */
function ExactModels({
  value,
  selectedModels,
  onToggleModel,
}: {
  value: PromptCalculatorInput;
  selectedModels: ReadonlySet<string>;
  onToggleModel: (id: string) => void;
}) {
  const exactPanelId = useId();
  const [showExact, setShowExact] = useState(false);

  return (
    <div>
      <button
        aria-controls={exactPanelId}
        aria-expanded={showExact}
        className="focus-visible:ring-primary flex cursor-pointer items-center gap-1 rounded-md font-sans text-sm tracking-[-0.01em] text-[#1E1E1E99] transition-colors duration-100 outline-none hover:text-[#1E1E1E] focus-visible:ring-2 dark:text-white/50 dark:hover:text-white"
        onClick={() => setShowExact((current) => !current)}
        type="button"
      >
        {showExact ? "Hide exact models" : "Pick exact models"}
        <HugeiconsIcon
          aria-hidden="true"
          className={cn(
            "size-3.5 transition-transform duration-200",
            showExact && "rotate-180"
          )}
          icon={ArrowDown01Icon}
        />
      </button>
      {/* Grid rows animate from 0fr to 1fr, so the panel opens smoothly. */}
      <div
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
          showExact
            ? "grid-rows-[1fr] opacity-100"
            : "grid-rows-[0fr] opacity-0"
        )}
        id={exactPanelId}
        inert={!showExact}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="mt-3 flex flex-col divide-y divide-[#1E1E1E0F] rounded-2xl bg-white px-4 shadow-[0_0.125rem_0.3125rem_#00000008] dark:divide-white/[0.06] dark:bg-white/[0.04]">
            {PROMPT_CALCULATOR_ENGINES.map((engine) => (
              <div
                className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:gap-4"
                key={engine.id}
              >
                <span className="flex w-28 shrink-0 items-center gap-2 font-sans text-sm font-medium text-[#1E1E1E] dark:text-white">
                  <EngineLogo engine={engine} onDarkPill />
                  {engine.name}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {engine.models.map((model) => {
                    const checked = selectedModels.has(model.id);

                    return (
                      <label
                        className={cn(
                          PILL_BASE,
                          "px-3 py-1 text-[0.8125rem]",
                          checked ? PILL_ACTIVE : PILL_INACTIVE
                        )}
                        key={model.id}
                      >
                        <input
                          checked={checked}
                          className="sr-only"
                          disabled={checked && value.models.length === 1}
                          onChange={() => onToggleModel(model.id)}
                          type="checkbox"
                        />
                        {model.label}
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ModelPills({ value, onChange }: PromptCalculatorPanelProps) {
  const selectedModels = new Set(value.models);

  /** Adds or removes one model, keeping catalog order and at least one model. */
  function toggleModel(id: string) {
    if (value.models.includes(id)) {
      if (value.models.length > 1) {
        onChange({ models: value.models.filter((model) => model !== id) });
      }
      return;
    }
    onChange({
      models: PROMPT_CALCULATOR_MODEL_IDS.filter(
        (model) => model === id || value.models.includes(model)
      ),
    });
  }

  /** An engine pill adds its default model, or drops every model of it. */
  function toggleEngine(engine: PromptCalculatorEngine) {
    const engineModels = new Set(engine.models.map((model) => model.id));
    const remaining = value.models.filter((id) => !engineModels.has(id));
    if (remaining.length < value.models.length) {
      if (remaining.length > 0) {
        onChange({ models: remaining });
      }
      return;
    }
    toggleModel(engine.defaultModel);
  }

  return (
    <fieldset className="flex min-w-0 flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <legend className={GROUP_LABEL}>Models</legend>
        <span className={GROUP_META}>
          {value.models.length} {value.models.length === 1 ? "model" : "models"}
        </span>
      </div>
      <EngineDropdown
        onToggleEngine={toggleEngine}
        selectedModels={selectedModels}
        value={value}
      />
      <EngineStrip
        onToggleEngine={toggleEngine}
        selectedModels={selectedModels}
        value={value}
      />

      <ExactModels
        onToggleModel={toggleModel}
        selectedModels={selectedModels}
        value={value}
      />
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
      <div className="relative sm:hidden">
        <select
          aria-label="Scan frequency"
          className={cn(MOBILE_FIELD, "appearance-none pr-10")}
          onChange={(event) =>
            onChange({
              frequency: event.target.value as PromptCalculatorFrequencyId,
            })
          }
          value={value.frequency}
        >
          {PROMPT_CALCULATOR_FREQUENCIES.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
        <HugeiconsIcon
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-[#1E1E1E80] dark:text-white/50"
          icon={ArrowDown01Icon}
        />
      </div>
      <div className="hidden flex-wrap gap-2 sm:flex">
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

function planHeadroom(estimate: PromptCalculatorEstimate) {
  if (estimate.usage === null) {
    return "More than our largest plan includes";
  }
  return estimate.promptHeadroom === 0
    ? "Right at the plan limit"
    : `Room for ${numberFormat.format(estimate.promptHeadroom ?? 0)} more prompts`;
}

function EstimatePrice({ plan }: { plan: PricingPlan }) {
  const isCustom = plan.answersPerMonth === null;

  return (
    <>
      <div className="flex items-baseline gap-2">
        <span className="font-display text-[2.625rem] leading-13 font-normal tracking-[-0.01em] text-white tabular-nums">
          {isCustom ? (
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
      <span className="-mt-2 font-sans text-xs leading-4 text-white/70 tabular-nums">
        <FadeText
          text={
            isCustom
              ? "Priced to your usage"
              : `or ${plan.price.yearly}${plan.priceSuffix?.yearly ?? ""}, ${PRICING_ANNUAL_BADGE}`
          }
        />
      </span>
    </>
  );
}

function PlanAllowance({ estimate }: { estimate: PromptCalculatorEstimate }) {
  const ProjectsIcon = PRICING_ICONS.projects;
  const { plan } = estimate;

  return (
    <div className="flex items-center gap-2">
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
          <FadeText text={planHeadroom(estimate)} />
        </span>
      </div>
    </div>
  );
}

function CadenceSuggestion({
  fit,
  onApply,
}: {
  fit: NonNullable<ReturnType<typeof findFittingCadence>>;
  onApply: () => void;
}) {
  const ProjectsIcon = PRICING_ICONS.projects;

  return (
    <button
      className="-mx-2 -my-1 flex w-[calc(100%+1rem)] cursor-pointer items-center gap-2 rounded-xl px-2 py-1 text-left transition-[background-color] duration-150 outline-none hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/60"
      onClick={onApply}
      type="button"
    >
      <ProjectsIcon className="size-6 shrink-0 text-white" />
      <span className="flex flex-1 flex-col">
        <span className="font-sans text-sm leading-[1.125rem] font-medium text-white">
          Stay on {fit.plan.name} for {fit.plan.price.monthly}/mo
        </span>
        <span className="min-h-8 font-sans text-xs leading-4 text-white/90 min-[25rem]:min-h-4">
          Scan {fit.label.toLowerCase()} instead
        </span>
      </span>
      <HugeiconsIcon
        aria-hidden="true"
        className="size-4 shrink-0 text-white"
        icon={ArrowRight02Icon}
      />
    </button>
  );
}

function EstimateCard({ value, onChange }: PromptCalculatorPanelProps) {
  const estimate = estimatePromptUsage(value);
  const fittingCadence =
    estimate.usage === null ? findFittingCadence(value) : null;
  const { plan } = estimate;
  const isEnterprise = estimate.usage === null;
  const scans = Math.round(estimate.scansPerMonth * 10) / 10;
  const TrackingIcon = PRICING_ICONS.tracking;

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
            <EstimatePrice plan={plan} />
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
                  {numberFormat.format(value.prompts)}{" "}
                  {value.prompts === 1 ? "prompt" : "prompts"} ×{" "}
                  {value.models.length} models × {scans} scans
                </span>
              </div>
            </li>
            <li>
              {fittingCadence ? (
                <CadenceSuggestion
                  fit={fittingCadence}
                  onApply={() =>
                    onChange({ frequency: fittingCadence.frequency })
                  }
                />
              ) : (
                <PlanAllowance estimate={estimate} />
              )}
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
      <div className="flex min-w-0 flex-col rounded-3xl bg-[#F7F7F7] dark:bg-white/[0.04]">
        <PromptsPanel onChange={onChange} value={value} />
        <div className="flex flex-col gap-7 px-6 pt-5 pb-7">
          <ModelPills onChange={onChange} value={value} />
          <FrequencyPills onChange={onChange} value={value} />
        </div>
      </div>
      <EstimateCard onChange={onChange} value={value} />
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
    models: normalizeModelIds(value.models),
    frequency: value.frequency,
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
