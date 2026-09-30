import type { PromptCalculatorFrequencyId } from "@/types/landing/prompt-calculator";

/** Mirrors the query params, so `/pricing?prompts=120&models=chatgpt,claude&frequency=weekly` prefills the calculator. */
export const PROMPT_CALCULATOR_PARAMS = {
  prompts: "prompts",
  models: "models",
  frequency: "frequency",
} as const;

export const PROMPT_CALCULATOR_ANCHOR = "calculator";

/**
 * Engine ids. The `models` query param takes these as shortcuts for each
 * engine's default model, so `?models=chatgpt,claude` works.
 */
export const PROMPT_CALCULATOR_ENGINE_IDS = [
  "chatgpt",
  "claude",
  "gemini",
  "perplexity",
  "grok",
  "kimi",
  "deepseek",
  "mistral",
  "meta",
  "zai",
] as const;

/** Scan cadences offered in the dashboard's GEO settings. */
export const PROMPT_CALCULATOR_FREQUENCIES = [
  {
    id: "daily",
    label: "Daily",
    intervalDays: 1,
    hint: "Catch shifts in answers the day they happen.",
  },
  {
    id: "every-2-days",
    label: "Every 2 days",
    intervalDays: 2,
    hint: "Close to daily at half the answers.",
  },
  {
    id: "every-3-days",
    label: "Every 3 days",
    intervalDays: 3,
    hint: "A close watch without the day-to-day noise.",
  },
  {
    id: "weekly",
    label: "Weekly",
    intervalDays: 7,
    hint: "Enough for a weekly report.",
  },
  {
    id: "every-2-weeks",
    label: "Every 2 weeks",
    intervalDays: 14,
    hint: "Follow trends rather than single moves.",
  },
  {
    id: "monthly",
    label: "Monthly",
    intervalDays: 30,
    hint: "A monthly check-in on where you stand.",
  },
] as const;

export const PROMPT_CALCULATOR_DAYS_PER_MONTH = 30;

export const PROMPT_CALCULATOR_MIN_PROMPTS = 1;
export const PROMPT_CALCULATOR_MAX_PROMPTS = 10_000;

export const PROMPT_CALCULATOR_DEFAULT_PROMPTS = 50;
/** The default models of ChatGPT, Claude and Gemini. */
export const PROMPT_CALCULATOR_DEFAULT_MODELS: string[] = [
  "openai/gpt-5.6-sol",
  "anthropic/claude-opus-5.5",
  "google/gemini-3.8-flash",
];
export const PROMPT_CALCULATOR_DEFAULT_FREQUENCY: PromptCalculatorFrequencyId =
  "daily";

/** Every stop the prompt slider snaps to; typed amounts sit between two stops. */
export const PROMPT_CALCULATOR_STOPS = [
  5, 10, 25, 50, 100, 150, 250, 500, 1000,
] as const;

/**
 * Labeled stops under the slider. Each caption covers the prompt counts up to
 * its stop, so the in-between stops borrow the next one's caption.
 */
export const PROMPT_CALCULATOR_MILESTONES = [
  {
    prompts: 5,
    label: "5",
    name: "Spot check",
    detail: "for your brand and the one question buyers ask most.",
  },
  {
    prompts: 25,
    label: "25",
    name: "Core buyer questions",
    detail: "for one product in one market.",
  },
  {
    prompts: 100,
    label: "100",
    name: "The whole category",
    detail: "with every use case, comparison and alternative.",
  },
  {
    prompts: 250,
    label: "250",
    name: "Several markets",
    detail: "across regions, segments or product lines.",
  },
  {
    prompts: 1000,
    label: "1K",
    name: "Every angle",
    detail: "for several products or brands, tracked in depth.",
  },
] as const;

export const PROMPT_CALCULATOR_HEADING =
  "How many prompts do you want to track?";
export const PROMPT_CALCULATOR_SUBHEADING =
  "Every prompt runs once on every model you pick, each time we scan. Each run is one AI answer.";
