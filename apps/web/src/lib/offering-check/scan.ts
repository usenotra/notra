import { gateway } from "@ai-sdk/gateway";
import { openai } from "@ai-sdk/openai";
import { generateText, Output, streamText } from "ai";

import {
  OFFERING_CHECK_ANSWER_MAX_OUTPUT_TOKENS,
  OFFERING_CHECK_JUDGE_MAX_OUTPUT_TOKENS,
  OFFERING_CHECK_MAX_OTHER_OFFERINGS,
  OFFERING_CHECK_MAX_QUERIES,
  OFFERING_CHECK_MODEL,
  OFFERING_CHECK_MODEL_LABEL,
} from "@/constants/offering-check";
import { offeringJudgementSchema } from "@/schemas/offering-check";
import type {
  OfferingCheckInput,
  OfferingCheckMode,
  OfferingCheckResult,
  OfferingRawAnswer,
  OfferingStreamEmit,
} from "@/types/offering-check";
import {
  buildOfferingQuestion,
  domainOfUrl,
  groupSourcesByDomain,
  resolveOverall,
  stripAnswerCitations,
} from "@/utils/offering-check";

import {
  buildOfferingJudgePrompt,
  OFFERING_ANSWER_SYSTEM_PROMPT,
  OFFERING_JUDGE_SYSTEM_PROMPT,
} from "./prompts";

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

async function askModel(
  input: OfferingCheckInput,
  mode: OfferingCheckMode,
  emit: OfferingStreamEmit,
  abortSignal: AbortSignal
): Promise<OfferingRawAnswer> {
  const stream = streamText({
    model: gateway(OFFERING_CHECK_MODEL),
    instructions: OFFERING_ANSWER_SYSTEM_PROMPT,
    prompt: buildOfferingQuestion(input),
    tools:
      mode === "search"
        ? {
            web_search: openai.tools.webSearch({ searchContextSize: "low" }),
          }
        : undefined,
    reasoning: "low",
    providerOptions: { openai: { reasoningSummary: "auto" } },
    maxOutputTokens: OFFERING_CHECK_ANSWER_MAX_OUTPUT_TOKENS,
    abortSignal,
  });

  const startedAt = Date.now();
  const queries = new Set<string>();
  const retrievedUrls: string[] = [];
  const citedUrls: string[] = [];
  let answer = "";
  let reasoning = "";

  for await (const part of stream.fullStream) {
    if (part.type === "text-delta") {
      answer += part.text;
      emit({ type: "delta", mode, text: part.text });
    } else if (part.type === "reasoning-delta") {
      reasoning += part.text;
      emit({ type: "reasoning", mode, text: part.text });
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

  const seconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
  emit({ type: "answered", mode, seconds });
  return {
    answer,
    reasoning: reasoning.trim(),
    seconds,
    queries: [...queries].slice(0, OFFERING_CHECK_MAX_QUERIES),
    retrievedUrls,
    citedUrls,
  };
}

async function judgeAnswers(
  input: OfferingCheckInput,
  memory: OfferingRawAnswer,
  search: OfferingRawAnswer,
  abortSignal: AbortSignal
) {
  const result = await generateText({
    model: gateway(OFFERING_CHECK_MODEL),
    instructions: OFFERING_JUDGE_SYSTEM_PROMPT,
    prompt: buildOfferingJudgePrompt(input, memory, search),
    output: Output.object({ schema: offeringJudgementSchema }),
    reasoning: "low",
    maxOutputTokens: OFFERING_CHECK_JUDGE_MAX_OUTPUT_TOKENS,
    abortSignal,
  });
  return result.output;
}

export async function runOfferingCheck(
  input: OfferingCheckInput,
  emit: OfferingStreamEmit,
  abortSignal: AbortSignal
): Promise<OfferingCheckResult> {
  const [memory, search] = await Promise.all([
    askModel(input, "memory", emit, abortSignal),
    askModel(input, "search", emit, abortSignal),
  ]);
  const judgement = await judgeAnswers(input, memory, search, abortSignal);

  const memoryResult = {
    verdict: judgement.memoryVerdict,
    summary: judgement.memorySummary,
    answer: stripAnswerCitations(memory.answer),
    reasoning: memory.reasoning,
    seconds: memory.seconds,
  };
  const searchResult = {
    verdict: judgement.searchVerdict,
    summary: judgement.searchSummary,
    answer: stripAnswerCitations(search.answer),
    reasoning: search.reasoning,
    seconds: search.seconds,
  };
  return {
    domain: input.domain,
    feature: input.feature,
    companyName: judgement.companyName.trim() || input.domain,
    companyDescription: judgement.companyDescription.trim(),
    model: OFFERING_CHECK_MODEL_LABEL,
    overall: resolveOverall(memoryResult, searchResult),
    memory: memoryResult,
    search: searchResult,
    otherOfferings: judgement.otherOfferings.slice(
      0,
      OFFERING_CHECK_MAX_OTHER_OFFERINGS
    ),
    queries: search.queries,
    searchUsed: search.queries.length > 0 || search.retrievedUrls.length > 0,
    sources: groupSourcesByDomain(
      input.domain,
      search.retrievedUrls,
      search.citedUrls
    ),
    checkedAt: new Date().toISOString(),
  };
}
