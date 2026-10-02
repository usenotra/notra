import { ClaudeAiIcon } from "@notra/ui/components/ui/svgs/claudeAiIcon";
import { Deepseek } from "@notra/ui/components/ui/svgs/deepseek";
import { Gemini } from "@notra/ui/components/ui/svgs/gemini";
import { Grok } from "@notra/ui/components/ui/svgs/grok";
import { GrokDark } from "@notra/ui/components/ui/svgs/grokDark";
import { Kimi } from "@notra/ui/components/ui/svgs/kimi";
import { Meta } from "@notra/ui/components/ui/svgs/meta";
import { Mistral } from "@notra/ui/components/ui/svgs/mistral";
import { Openai } from "@notra/ui/components/ui/svgs/openai";
import { OpenaiDark } from "@notra/ui/components/ui/svgs/openaiDark";
import { Perplexity } from "@notra/ui/components/ui/svgs/perplexity";
import { Zai } from "@notra/ui/components/ui/svgs/zai";

import type { PromptCalculatorEngine } from "@/types/landing/prompt-calculator";

/**
 * Engines every plan can scan, and their current models. Mirrors
 * `GEO_MODEL_CATALOG_SEED` in `packages/geo-core/src/constants/geo-model-catalog.ts`
 * the way the dashboard's engine picker shows it: newest release first, with
 * `grok-4.6` excluded. Older models the product still accepts are left off so
 * the list stays short. `defaultModel` is the catalog's `default: true` model,
 * or the newest where there is none. The coding agents (Cursor, Claude Code,
 * Codex, OpenCode) are flag-gated per organization, so they stay off here.
 */
export const PROMPT_CALCULATOR_ENGINES: PromptCalculatorEngine[] = [
  {
    id: "chatgpt",
    name: "ChatGPT",
    featured: true,
    icon: Openai,
    darkIcon: OpenaiDark,
    defaultModel: "openai/gpt-5.6-sol",
    models: [
      { id: "openai/gpt-6-sol", label: "GPT-6 Sol" },
      { id: "openai/gpt-6-luna", label: "GPT-6 Luna" },
      { id: "openai/gpt-6-astra", label: "GPT-6 Astra" },
      { id: "openai/gpt-5.6-sol", label: "GPT-5.6 Sol" },
      { id: "openai/gpt-5.6-terra", label: "GPT-5.6 Terra" },
    ],
  },
  {
    id: "claude",
    name: "Claude",
    featured: true,
    icon: ClaudeAiIcon,
    defaultModel: "anthropic/claude-opus-5.5",
    models: [
      { id: "anthropic/claude-opus-5.5", label: "Opus 5.5" },
      { id: "anthropic/claude-fable-5.1", label: "Fable 5.1" },
      { id: "anthropic/claude-opus-5", label: "Opus 5" },
      { id: "anthropic/claude-fable-5", label: "Fable 5" },
      { id: "anthropic/claude-sonnet-5", label: "Sonnet 5" },
    ],
  },
  {
    id: "gemini",
    name: "Gemini",
    featured: true,
    icon: Gemini,
    defaultModel: "google/gemini-3.8-flash",
    models: [
      { id: "google/gemini-3.8-flash", label: "Gemini 3.8 Flash" },
      { id: "google/gemini-3.5-flash", label: "Gemini 3.5 Flash" },
      { id: "google/gemini-3.1-pro-preview", label: "Gemini 3.1 Pro" },
    ],
  },
  {
    id: "perplexity",
    name: "Perplexity",
    featured: true,
    icon: Perplexity,
    defaultModel: "perplexity/sonar",
    models: [{ id: "perplexity/sonar", label: "Sonar" }],
  },
  {
    id: "grok",
    name: "Grok",
    featured: true,
    icon: Grok,
    darkIcon: GrokDark,
    defaultModel: "spacexai/grok-4.7",
    models: [
      { id: "spacexai/grok-4.7", label: "Grok 4.7" },
      { id: "spacexai/grok-4.5", label: "Grok 4.5" },
    ],
  },
  {
    id: "kimi",
    name: "Kimi",
    featured: false,
    icon: Kimi,
    defaultModel: "moonshotai/kimi-k3",
    models: [
      { id: "moonshotai/kimi-k3", label: "Kimi K3" },
      { id: "moonshotai/kimi-k2.6", label: "Kimi K2.6" },
    ],
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    featured: false,
    icon: Deepseek,
    defaultModel: "deepseek/deepseek-v4-pro",
    models: [
      { id: "deepseek/deepseek-v4-pro", label: "DeepSeek V4 Pro" },
      { id: "deepseek/deepseek-v4-flash", label: "DeepSeek V4 Flash" },
    ],
  },
  {
    id: "mistral",
    name: "Mistral",
    featured: false,
    icon: Mistral,
    defaultModel: "mistral/mistral-medium-3.5",
    models: [{ id: "mistral/mistral-medium-3.5", label: "Mistral Medium 3.5" }],
  },
  {
    id: "meta",
    name: "Meta AI",
    featured: false,
    icon: Meta,
    defaultModel: "meta/muse-spark-1.3",
    models: [
      { id: "meta/muse-spark-1.3", label: "Muse Spark 1.3" },
      { id: "meta/muse-spark-1.2", label: "Muse Spark 1.2" },
    ],
  },
  {
    id: "zai",
    name: "Z.AI",
    featured: false,
    icon: Zai,
    defaultModel: "zai/glm-5.3",
    models: [
      { id: "zai/glm-5.3", label: "GLM 5.3" },
      { id: "zai/glm-5.2", label: "GLM 5.2" },
      { id: "zai/glm-5.1", label: "GLM 5.1" },
    ],
  },
];

/** Every model id the `models` query param accepts, in display order. */
export const PROMPT_CALCULATOR_MODEL_IDS: string[] =
  PROMPT_CALCULATOR_ENGINES.flatMap((engine) =>
    engine.models.map((model) => model.id)
  );
