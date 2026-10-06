import { gateway } from "@ai-sdk/gateway";
import { openai } from "@ai-sdk/openai";
import { generateText, Output, streamText } from "ai";

import {
  OFFERING_CHECK_GATEWAY_TAG,
  OFFERING_CHECK_MAX_OTHER_OFFERINGS,
  OFFERING_CHECK_MAX_OUTPUT_TOKENS,
  OFFERING_CHECK_MAX_QUERIES,
  OFFERING_CHECK_MODEL,
  OFFERING_CHECK_MODEL_LABEL,
} from "@/constants/offering-check";
import { offeringJudgeSchema } from "@/schemas/offering-check";
import type {
  OfferingAnswer,
  OfferingCheckInput,
  OfferingCheckResult,
  OfferingQuestion,
  OfferingStreamEmit,
} from "@/types/offering-check";
import {
  buildOfferingQuestions,
  domainOfUrl,
  groupSourcesByDomain,
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

const MS_PER_SECOND = 1000;

/**
 * Tags every gateway call so the free tool's spend shows up on its own in
 * AI Gateway, split by step. Visitors type these prompts, so they are never
 * used for training.
 */
function offeringGatewayOptions(step: string) {
  return {
    tags: [OFFERING_CHECK_GATEWAY_TAG, `${OFFERING_CHECK_GATEWAY_TAG}-${step}`],
    disallowPromptTraining: true,
  };
}

type AnsweredQuestion = Omit<OfferingAnswer, "verdict" | "summary">;

async function answerQuestion(
  input: OfferingCheckInput,
  question: OfferingQuestion,
  emit: OfferingStreamEmit,
  abortSignal: AbortSignal
): Promise<AnsweredQuestion> {
  const { kind } = question;
  const stream = streamText({
    model: gateway(OFFERING_CHECK_MODEL),
    instructions: OFFERING_ANSWER_SYSTEM_PROMPT,
    prompt: question.text,
    tools: {
      web_search: openai.tools.webSearch({ searchContextSize: "low" }),
    },
    reasoning: "low",
    providerOptions: {
      openai: { reasoningSummary: "auto" },
      gateway: offeringGatewayOptions(`answer-${kind}`),
    },
    maxOutputTokens: OFFERING_CHECK_MAX_OUTPUT_TOKENS,
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
      emit({ type: "delta", kind, text: part.text });
    } else if (part.type === "reasoning-delta") {
      reasoning += part.text;
      emit({ type: "reasoning", kind, text: part.text });
    } else if (part.type === "tool-result") {
      const found = readSearchOutput(part.output);
      for (const query of found.queries) {
        queries.add(query);
      }
      retrievedUrls.push(...found.urls);
      emit({
        type: "search",
        kind,
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

  const cleanAnswer = stripAnswerCitations(answer);
  if (!cleanAnswer) {
    throw new Error("Model returned an empty answer");
  }
  const seconds = Math.max(
    1,
    Math.round((Date.now() - startedAt) / MS_PER_SECOND)
  );
  emit({ type: "answered", kind, seconds });
  return {
    kind,
    question: question.text,
    answer: cleanAnswer,
    reasoning: reasoning.trim(),
    seconds,
    queries: [...queries].slice(0, OFFERING_CHECK_MAX_QUERIES),
    searchUsed: queries.size > 0 || retrievedUrls.length > 0,
    sources: groupSourcesByDomain(input.domain, retrievedUrls, citedUrls),
  };
}

/** The judge sometimes repeats an offering with different casing or spacing. */
function uniqueOfferings(offerings: readonly string[]): string[] {
  const seen = new Set<string>();
  return offerings.flatMap((offering) => {
    const name = offering.trim();
    const key = name.toLowerCase();
    if (!name || seen.has(key)) {
      return [];
    }
    seen.add(key);
    return [name];
  });
}

/**
 * Asks every question in parallel, then grades all answers in one judge call
 * that alone sees the feature name and the problem.
 */
export async function runOfferingCheck(
  input: OfferingCheckInput,
  emit: OfferingStreamEmit,
  abortSignal: AbortSignal
): Promise<OfferingCheckResult> {
  // One failed answer fails the check, so stop paying for the other one.
  const answering = new AbortController();
  const signal = AbortSignal.any([abortSignal, answering.signal]);
  const answered = await Promise.all(
    buildOfferingQuestions(input).map((question) =>
      answerQuestion(input, question, emit, signal)
    )
  ).catch((error: unknown) => {
    answering.abort();
    throw error;
  });

  const { output: judged } = await generateText({
    model: gateway(OFFERING_CHECK_MODEL),
    instructions: OFFERING_JUDGE_SYSTEM_PROMPT,
    prompt: buildOfferingJudgePrompt(input, answered),
    output: Output.object({ schema: offeringJudgeSchema }),
    reasoning: "low",
    providerOptions: { gateway: offeringGatewayOptions("judge") },
    abortSignal,
  });

  return {
    domain: input.domain,
    feature: input.feature,
    problem: input.problem,
    companyName: judged.companyName.trim() || input.domain,
    companyDescription: judged.companyDescription.trim(),
    model: OFFERING_CHECK_MODEL_LABEL,
    otherOfferings: uniqueOfferings(judged.otherOfferings).slice(
      0,
      OFFERING_CHECK_MAX_OTHER_OFFERINGS
    ),
    answers: answered.map((answer) => {
      const grade = judged[answer.kind];
      if (!grade) {
        throw new Error(`Judge did not grade the ${answer.kind} answer`);
      }
      return { ...answer, ...grade };
    }),
    checkedAt: new Date().toISOString(),
  };
}
