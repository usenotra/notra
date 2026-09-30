import type { ComponentType, SVGProps } from "react";

import type {
  PROMPT_CALCULATOR_ENGINE_IDS,
  PROMPT_CALCULATOR_FREQUENCIES,
} from "@/constants/landing/prompt-calculator";
import type { PricingPlan } from "@/types/landing/pricing";

export type PromptCalculatorEngineId =
  (typeof PROMPT_CALCULATOR_ENGINE_IDS)[number];

export type PromptCalculatorFrequencyId =
  (typeof PROMPT_CALCULATOR_FREQUENCIES)[number]["id"];

export interface PromptCalculatorInput {
  prompts: number;
  models: PromptCalculatorEngineId[];
  frequency: PromptCalculatorFrequencyId;
  /** Languages scanned on top of English, 0–4. */
  languages: number;
}

export interface PromptCalculatorEstimate {
  answersPerMonth: number;
  /** Prompt runs per scan: every prompt, plus the translated ones. */
  promptRuns: number;
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
  /** Featured engines show by default; the rest sit behind "more". */
  featured: boolean;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  /** Swapped in on dark backgrounds when the brand mark is monochrome. */
  darkIcon?: ComponentType<SVGProps<SVGSVGElement>>;
}
