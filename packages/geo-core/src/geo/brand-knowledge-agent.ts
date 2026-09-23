import { getRouteMetadata } from "@notra/ai/gateway";
import { generateText, Output, type LanguageModel } from "ai";

import {
  KNOWLEDGE_SCAN_MAX_TOKENS,
  KNOWLEDGE_SCAN_SYSTEM,
  KNOWLEDGE_SCAN_TIMEOUT_MS,
} from "../constants/brand-knowledge";
import { knowledgeScanOutputSchema } from "../schemas/brand-knowledge";
import type { AccuracyAgentResult } from "../types/accuracy-analysis";
import type { KnowledgeScanSource } from "../types/brand-knowledge";

export async function generateKnowledgeScan(
  model: LanguageModel,
  companyName: string | null,
  sources: KnowledgeScanSource[]
): Promise<AccuracyAgentResult> {
  const result = await generateText({
    model,
    instructions: KNOWLEDGE_SCAN_SYSTEM,
    prompt: JSON.stringify({
      brand: companyName,
      sources: sources.map((source) => ({
        origin: source.origin,
        url: source.url,
        path: source.path ?? null,
        markdown: source.markdown,
      })),
    }),
    output: Output.object({ schema: knowledgeScanOutputSchema }),
    maxOutputTokens: KNOWLEDGE_SCAN_MAX_TOKENS,
    reasoning: "low",
    maxRetries: 0,
    abortSignal: AbortSignal.timeout(KNOWLEDGE_SCAN_TIMEOUT_MS),
  });
  return {
    output: result.output,
    usage: result.usage,
    route: getRouteMetadata(result.finalStep.providerMetadata),
  };
}
