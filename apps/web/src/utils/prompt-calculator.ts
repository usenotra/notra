import { PRICING_PLANS } from "@/constants/landing/pricing";
import {
  PROMPT_CALCULATOR_ANCHOR,
  PROMPT_CALCULATOR_DAYS_PER_MONTH,
  PROMPT_CALCULATOR_DEFAULT_MODELS,
  PROMPT_CALCULATOR_FREQUENCIES,
  PROMPT_CALCULATOR_MAX_PROMPTS,
  PROMPT_CALCULATOR_MILESTONES,
  PROMPT_CALCULATOR_MIN_PROMPTS,
  PROMPT_CALCULATOR_PARAMS,
  PROMPT_CALCULATOR_STOPS,
} from "@/constants/landing/prompt-calculator";
import {
  PROMPT_CALCULATOR_ENGINES,
  PROMPT_CALCULATOR_MODEL_IDS,
} from "@/constants/landing/prompt-calculator-engines";
import type { PricingPlan } from "@/types/landing/pricing";
import type {
  PromptCalculatorEstimate,
  PromptCalculatorFrequencyId,
  PromptCalculatorInput,
} from "@/types/landing/prompt-calculator";

export function clampPrompts(value: number) {
  if (!Number.isFinite(value)) {
    return PROMPT_CALCULATOR_MIN_PROMPTS;
  }
  return Math.min(
    PROMPT_CALCULATOR_MAX_PROMPTS,
    Math.max(PROMPT_CALCULATOR_MIN_PROMPTS, Math.round(value))
  );
}

export function scansPerMonth(frequency: PromptCalculatorFrequencyId) {
  const option =
    PROMPT_CALCULATOR_FREQUENCIES.find((entry) => entry.id === frequency) ??
    PROMPT_CALCULATOR_FREQUENCIES[0];
  return PROMPT_CALCULATOR_DAYS_PER_MONTH / option.intervalDays;
}

const LAST_STOP = PROMPT_CALCULATOR_STOPS.length - 1;

/** Where a stop sits on the track, 0–1; stops are evenly spaced. */
function stopRatio(index: number) {
  return index / LAST_STOP;
}

/**
 * Where `prompts` sits on the stepped slider, 0–1. Amounts between two stops
 * are placed on a log scale between them.
 */
export function promptsToStopRatio(prompts: number) {
  const upper = PROMPT_CALCULATOR_STOPS.findIndex((stop) => prompts <= stop);
  if (upper === -1) {
    return 1;
  }
  if (upper === 0) {
    return 0;
  }
  const low = PROMPT_CALCULATOR_STOPS[upper - 1] ?? prompts;
  const high = PROMPT_CALCULATOR_STOPS[upper] ?? prompts;
  const within =
    (Math.log(prompts) - Math.log(low)) / (Math.log(high) - Math.log(low));
  return stopRatio(upper - 1 + within);
}

/** The caption for `prompts`: the first milestone at or above it. */
export function milestoneFor(prompts: number) {
  const last = PROMPT_CALCULATOR_MILESTONES.at(
    -1
  ) as (typeof PROMPT_CALCULATOR_MILESTONES)[number];
  return (
    PROMPT_CALCULATOR_MILESTONES.find((entry) => prompts <= entry.prompts) ??
    last
  );
}

function findPlan(answersPerMonth: number): PricingPlan {
  const enterprise = PRICING_PLANS.at(-1) as PricingPlan;
  return (
    PRICING_PLANS.find(
      (plan) =>
        plan.answersPerMonth !== null && answersPerMonth <= plan.answersPerMonth
    ) ?? enterprise
  );
}

export function estimatePromptUsage({
  prompts,
  models,
  frequency,
}: PromptCalculatorInput): PromptCalculatorEstimate {
  const scans = scansPerMonth(frequency);
  const answersPerMonth = Math.ceil(prompts * models.length * scans);
  const plan = findPlan(answersPerMonth);

  if (plan.answersPerMonth === null || models.length === 0) {
    return {
      answersPerMonth,
      scansPerMonth: scans,
      plan,
      usage: null,
      promptHeadroom: null,
    };
  }

  const answersPerPrompt = models.length * scans;
  const maxPrompts = Math.floor(plan.answersPerMonth / answersPerPrompt);

  return {
    answersPerMonth,
    scansPerMonth: scans,
    plan,
    usage: answersPerMonth / plan.answersPerMonth,
    promptHeadroom: Math.max(0, maxPrompts - prompts),
  };
}

export function buildPromptCalculatorSearch({
  prompts,
  models,
  frequency,
}: PromptCalculatorInput) {
  // Built by hand so the model list keeps readable commas instead of `%2C`.
  const params = [
    `${PROMPT_CALCULATOR_PARAMS.prompts}=${prompts}`,
    `${PROMPT_CALCULATOR_PARAMS.models}=${models.join(",")}`,
    `${PROMPT_CALCULATOR_PARAMS.frequency}=${frequency}`,
  ];
  return `?${params.join("&")}#${PROMPT_CALCULATOR_ANCHOR}`;
}

/**
 * When an estimate lands on Enterprise, the most frequent slower cadence that
 * brings it back under a self-serve plan, or `null` when even monthly scans
 * don't fit.
 */
export function findFittingCadence(input: PromptCalculatorInput) {
  const current = PROMPT_CALCULATOR_FREQUENCIES.findIndex(
    (option) => option.id === input.frequency
  );
  for (const option of PROMPT_CALCULATOR_FREQUENCIES.slice(current + 1)) {
    const frequency = option.id as PromptCalculatorFrequencyId;
    const { plan } = estimatePromptUsage({ ...input, frequency });
    if (plan.answersPerMonth !== null) {
      return { frequency, label: option.label, plan };
    }
  }
  return null;
}

/**
 * Turns the raw `models` param into catalog model ids: engine names like
 * `claude` become that engine's default model, unknown ids drop out, and the
 * result keeps catalog order. Falls back to the defaults when nothing is left.
 */
export function normalizeModelIds(raw: readonly string[]) {
  const wanted = new Set<string>();
  for (const id of raw) {
    const engine = PROMPT_CALCULATOR_ENGINES.find((entry) => entry.id === id);
    const model = engine ? engine.defaultModel : id;
    if (model) {
      wanted.add(model);
    }
  }
  const models = PROMPT_CALCULATOR_MODEL_IDS.filter((id) => wanted.has(id));
  return models.length > 0 ? models : [...PROMPT_CALCULATOR_DEFAULT_MODELS];
}
