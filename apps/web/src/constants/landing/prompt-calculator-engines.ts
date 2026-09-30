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
 * Engines every plan can scan, mirroring the dashboard's model catalog. The
 * coding agents (Cursor, Claude Code, Codex, OpenCode) are flag-gated per
 * organization, so they stay off the public calculator.
 */
export const PROMPT_CALCULATOR_ENGINES: PromptCalculatorEngine[] = [
  {
    id: "chatgpt",
    name: "ChatGPT",
    featured: true,
    icon: Openai,
    darkIcon: OpenaiDark,
  },
  { id: "claude", name: "Claude", featured: true, icon: ClaudeAiIcon },
  { id: "gemini", name: "Gemini", featured: true, icon: Gemini },
  { id: "perplexity", name: "Perplexity", featured: true, icon: Perplexity },
  { id: "grok", name: "Grok", featured: true, icon: Grok, darkIcon: GrokDark },
  { id: "kimi", name: "Kimi", featured: false, icon: Kimi },
  { id: "deepseek", name: "DeepSeek", featured: false, icon: Deepseek },
  { id: "mistral", name: "Mistral", featured: false, icon: Mistral },
  { id: "meta", name: "Meta AI", featured: false, icon: Meta },
  { id: "zai", name: "Z.AI", featured: false, icon: Zai },
];
