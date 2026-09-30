import type { ComponentType, SVGProps } from "react";

import type {
  PROMPT_CALCULATOR_ENGINE_IDS,
  PROMPT_CALCULATOR_FREQUENCIES,
} from "@/constants/landing/prompt-calculator";
import type { PricingPlan } from "@/types/landing/pricing";

type PromptCalculatorEngineId = (typeof PROMPT_CALCULATOR_ENGINE_IDS)[number];

export type PromptCalculatorFrequencyId =
  (typeof PROMPT_CALCULATOR_FREQUENCIES)[number]["id"];

export interface PromptCalculatorInput {
  prompts: number;
  /** Model ids from the GEO catalog, e.g. `anthropic/claude-opus-5.5`. */
  models: string[];
  frequency: PromptCalculatorFrequencyId;
}

export interface PromptCalculatorEstimate {
  answersPerMonth: number;
  scansPerMonth: number;
  plan: PricingPlan;
  /** Share of the recommended plan's quota in use, 0–1. `null` on Enterprise. */
  usage: number | null;
  /** Prompts that still fit in the recommended plan at the same models and cadence. */
  promptHeadroom: number | null;
}

export interface PromptCalculatorPanelProps {
  value: PromptCalculatorInput;
  onChange: (value: Partial<PromptCalculatorInput>) => void;
}

export interface PromptCalculatorEngine {
  id: PromptCalculatorEngineId;
  name: string;
  /** Featured engines show first; the rest sit behind "See more". */
  featured: boolean;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  /** Swapped in on dark backgrounds when the brand mark is monochrome. */
  darkIcon?: ComponentType<SVGProps<SVGSVGElement>>;
  /** The engine's models, newest first. */
  models: readonly PromptCalculatorModel[];
  /** The model an engine pill selects, as the product scans by default. */
  defaultModel: string;
}

interface PromptCalculatorModel {
  id: string;
  label: string;
}
