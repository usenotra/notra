import { gateway } from "@ai-sdk/gateway";
import { openai } from "@ai-sdk/openai";
import { Output, streamText } from "ai";

import {
  OFFERING_CHECK_MAX_OTHER_OFFERINGS,
  OFFERING_CHECK_MAX_OUTPUT_TOKENS,
  OFFERING_CHECK_MAX_QUERIES,
  OFFERING_CHECK_MODEL,
  OFFERING_CHECK_MODEL_LABEL,
} from "@/constants/offering-check";
import { offeringResponseSchema } from "@/schemas/offering-check";
import type {
  OfferingCheckInput,
  OfferingCheckResult,
  OfferingStreamEmit,
} from "@/types/offering-check";
import {
  buildOfferingQuestion,
  domainOfUrl,
  groupSourcesByDomain,
  stripAnswerCitations,
} from "@/utils/offering-check";

import { buildOfferingPrompt, OFFERING_ANSWER_SYSTEM_PROMPT } from "./prompts";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readSearchOutput(output: unknown) {
  if (!isRecord(output)) {
    return { queries: [], urls: [] };
  }
  const action = isRecord(output.action) ? output.action : {};
  const listed = Array.isArray(action.queries)
    ? action.queries
    : [action.query];
  const queries = listed.flatMap((query) =>
    typeof query === "string" && query.trim().length > 0 ? [query.trim()] : []
  );
  const urls = (Array.isArray(output.sources) ? output.sources : []).flatMap(
    (source) =>
      isRecord(source) && typeof source.url === "string" ? [source.url] : []
  );
  return { queries, urls };
}

export async function runOfferingCheck(
  input: OfferingCheckInput,
  emit: OfferingStreamEmit,
  abortSignal: AbortSignal
): Promise<OfferingCheckResult> {
  const stream = streamText({
    model: gateway(OFFERING_CHECK_MODEL),
    instructions: OFFERING_ANSWER_SYSTEM_PROMPT,
    prompt: buildOfferingPrompt(input, buildOfferingQuestion(input)),
    tools: {
      web_search: openai.tools.webSearch({ searchContextSize: "low" }),
    },
    output: Output.object({ schema: offeringResponseSchema }),
    reasoning: "low",
    providerOptions: { openai: { reasoningSummary: "auto" } },
    maxOutputTokens: OFFERING_CHECK_MAX_OUTPUT_TOKENS,
    abortSignal,
  });

  const startedAt = Date.now();
  const queries = new Set<string>();
  const retrievedUrls: string[] = [];
  const citedUrls: string[] = [];
  let streamedAnswer = "";
  let reasoning = "";

  await Promise.all([
    (async () => {
      for await (const partial of stream.partialOutputStream) {
        if (
          typeof partial.answer === "string" &&
          partial.answer.startsWith(streamedAnswer)
        ) {
          const text = partial.answer.slice(streamedAnswer.length);
          streamedAnswer = partial.answer;
          if (text) {
            emit({ type: "delta", text });
          }
        }
      }
    })(),
    (async () => {
      for await (const part of stream.fullStream) {
        if (part.type === "reasoning-delta") {
          reasoning += part.text;
          emit({ type: "reasoning", text: part.text });
        } else if (part.type === "tool-result") {
          const found = readSearchOutput(part.output);
          for (const query of found.queries) {
            queries.add(query);
          }
          retrievedUrls.push(...found.urls);
          emit({
            type: "search",
            queries: found.queries,
            domains: [
              ...new Set(found.urls.flatMap((url) => domainOfUrl(url) ?? [])),
            ],
          });
        } else if (part.type === "source" && part.sourceType === "url") {
          citedUrls.push(part.url);
        } else if (part.type === "error") {
          throw part.error;
        }
      }
    })(),
  ]);

  const response = await stream.output;
  const answer = stripAnswerCitations(response.answer);
  if (!answer) {
    throw new Error("Model returned an empty answer");
  }
  const seconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
  emit({ type: "answered", seconds });
  return {
    domain: input.domain,
    feature: input.feature,
    companyName: response.companyName.trim() || input.domain,
    companyDescription: response.companyDescription.trim(),
    model: OFFERING_CHECK_MODEL_LABEL,
    verdict: response.verdict,
    summary: response.summary,
    answer,
    reasoning: reasoning.trim(),
    seconds,
    otherOfferings: response.otherOfferings.slice(
      0,
      OFFERING_CHECK_MAX_OTHER_OFFERINGS
    ),
    queries: [...queries].slice(0, OFFERING_CHECK_MAX_QUERIES),
    searchUsed: queries.size > 0 || retrievedUrls.length > 0,
    sources: groupSourcesByDomain(input.domain, retrievedUrls, citedUrls),
    checkedAt: new Date().toISOString(),
  };
}
