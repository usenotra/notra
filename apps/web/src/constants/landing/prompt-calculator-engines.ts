import { ClaudeAiIcon } from "@notra/ui/components/ui/svgs/claudeAiIcon";
import { Gemini } from "@notra/ui/components/ui/svgs/gemini";
import { Grok } from "@notra/ui/components/ui/svgs/grok";
import { GrokDark } from "@notra/ui/components/ui/svgs/grokDark";
import { Openai } from "@notra/ui/components/ui/svgs/openai";
import { OpenaiDark } from "@notra/ui/components/ui/svgs/openaiDark";
import { Perplexity } from "@notra/ui/components/ui/svgs/perplexity";

import type { PromptCalculatorEngine } from "@/types/landing/prompt-calculator";

/** The engines the calculator offers, in display order. */
export const PROMPT_CALCULATOR_ENGINES: PromptCalculatorEngine[] = [
  { id: "chatgpt", name: "ChatGPT", icon: Openai, darkIcon: OpenaiDark },
  { id: "claude", name: "Claude", icon: ClaudeAiIcon },
  { id: "gemini", name: "Gemini", icon: Gemini },
  { id: "perplexity", name: "Perplexity", icon: Perplexity },
  { id: "grok", name: "Grok", icon: Grok, darkIcon: GrokDark },
];
