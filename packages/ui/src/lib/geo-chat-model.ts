import type { ChatgptModelId } from "@notra/ui/types/chatgpt";
import type { ClaudeChatModelId } from "@notra/ui/types/claude-chat";
import type { GeminiModelId } from "@notra/ui/types/gemini";
import type { PerplexityModelId } from "@notra/ui/types/perplexity";

const GROUNDED_SUFFIX = /-grounded$/;

function engineKey(engine: string): string {
  return engine.replace(GROUNDED_SUFFIX, "").toLowerCase();
}

export function chatgptModelForEngine(engine: string): ChatgptModelId {
  const key = engineKey(engine);
  if (key.includes("gpt-5.4-mini")) {
    return "gpt-5.4-mini";
  }
  if (key.includes("gpt-5.4") || key.includes("openai-direct")) {
    return "gpt-5.4";
  }
  return "sol";
}

export function claudeModelForEngine(engine: string): ClaudeChatModelId {
  const key = engineKey(engine);
  if (key.includes("opus-5.5")) {
    return "opus-5.5";
  }
  if (key.includes("haiku")) {
    return "haiku-4.5";
  }
  if (key.includes("sonnet") || key.includes("anthropic-direct")) {
    return "sonnet-4.6";
  }
  return "opus-5";
}

export function geminiModelForEngine(engine: string): GeminiModelId {
  const key = engineKey(engine);
  if (key.includes("flash-lite") || key.includes("flashlite")) {
    return "flash-lite";
  }
  if (key.includes("pro")) {
    return "pro";
  }
  return "flash";
}

export function perplexityModelForEngine(engine: string): PerplexityModelId {
  const key = engineKey(engine);
  if (key.includes("sonar-pro")) {
    return "sonar-pro";
  }
  if (key.includes("reasoning") || key.includes("research")) {
    return "reasoning";
  }
  return "sonar";
}
