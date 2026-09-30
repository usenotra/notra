import { PRICING_PLANS } from "@/constants/landing/pricing";
import {
  PROMPT_CALCULATOR_ANCHOR,
  PROMPT_CALCULATOR_DAYS_PER_MONTH,
  PROMPT_CALCULATOR_FREQUENCIES,
  PROMPT_CALCULATOR_MAX_PROMPTS,
  PROMPT_CALCULATOR_MILESTONES,
  PROMPT_CALCULATOR_MIN_PROMPTS,
  PROMPT_CALCULATOR_PARAMS,
  PROMPT_CALCULATOR_TRANSLATED_PROMPTS,
} from "@/constants/landing/prompt-calculator";
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

const LAST_STOP = PROMPT_CALCULATOR_MILESTONES.length - 1;

/** The nearest slider stop for `prompts`, used as the range input's value. */
export function nearestMilestoneIndex(prompts: number) {
  let best = 0;
  for (const [index, entry] of PROMPT_CALCULATOR_MILESTONES.entries()) {
    const current =
      PROMPT_CALCULATOR_MILESTONES[best]?.prompts ?? entry.prompts;
    if (
      Math.abs(Math.log(entry.prompts) - Math.log(prompts)) <
      Math.abs(Math.log(current) - Math.log(prompts))
    ) {
      best = index;
    }
  }
  return best;
}

/**
 * Where `prompts` sits on the stepped slider, 0–1. Stops are evenly spaced;
 * amounts between two stops are placed on a log scale between them.
 */
export function promptsToStopRatio(prompts: number) {
  const upper = PROMPT_CALCULATOR_MILESTONES.findIndex(
    (entry) => prompts <= entry.prompts
  );
  if (upper === -1) {
    return 1;
  }
  if (upper === 0) {
    return 0;
  }
  const low = PROMPT_CALCULATOR_MILESTONES[upper - 1]?.prompts ?? prompts;
  const high = PROMPT_CALCULATOR_MILESTONES[upper]?.prompts ?? prompts;
  const within =
    (Math.log(prompts) - Math.log(low)) / (Math.log(high) - Math.log(low));
  return (upper - 1 + within) / LAST_STOP;
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

/**
 * Prompt runs per scan, matching how a GEO scan plans its checks: every
 * prompt in English, plus up to `PROMPT_CALCULATOR_TRANSLATED_PROMPTS` of
 * them again in each extra language.
 */
function promptRunsPerScan(prompts: number, languages: number) {
  return (
    prompts +
    Math.min(prompts, PROMPT_CALCULATOR_TRANSLATED_PROMPTS) * languages
  );
}

export function estimatePromptUsage({
  prompts,
  models,
  frequency,
  languages,
}: PromptCalculatorInput): PromptCalculatorEstimate {
  const scans = scansPerMonth(frequency);
  const promptRuns = promptRunsPerScan(prompts, languages);
  const answersPerMonth = Math.ceil(promptRuns * models.length * scans);
  const plan = findPlan(answersPerMonth);

  if (plan.answersPerMonth === null || models.length === 0) {
    return {
      answersPerMonth,
      promptRuns,
      scansPerMonth: scans,
      plan,
      usage: null,
      promptHeadroom: null,
    };
  }

  // Past the translated few, each extra prompt only adds its English run.
  const answersPerPrompt = models.length * scans;
  const runsThatFit = Math.floor(plan.answersPerMonth / answersPerPrompt);

  return {
    answersPerMonth,
    promptRuns,
    scansPerMonth: scans,
    plan,
    usage: answersPerMonth / plan.answersPerMonth,
    promptHeadroom: Math.max(0, runsThatFit - promptRuns),
  };
}

export function buildPromptCalculatorSearch({
  prompts,
  models,
  frequency,
  languages,
}: PromptCalculatorInput) {
  // Built by hand so the model list keeps readable commas instead of `%2C`.
  const params = [
    `${PROMPT_CALCULATOR_PARAMS.prompts}=${prompts}`,
    `${PROMPT_CALCULATOR_PARAMS.models}=${models.join(",")}`,
    `${PROMPT_CALCULATOR_PARAMS.frequency}=${frequency}`,
    `${PROMPT_CALCULATOR_PARAMS.languages}=${languages}`,
  ];
  return `?${params.join("&")}#${PROMPT_CALCULATOR_ANCHOR}`;
}
