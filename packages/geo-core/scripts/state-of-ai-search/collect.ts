import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

/**
 * Collects answers for the public "State of AI Search" reports.
 *
 * Asks every prompt of every category to ChatGPT and Claude (both with web
 * search, like the consumer apps) and fetches Google's AI Overview through
 * SerpApi. Raw answers are cached per prompt, engine and sample, so a rerun
 * only fills the gaps and `build.ts` can re-aggregate for free.
 *
 *   bun --env-file=../../.env run packages/geo-core/scripts/state-of-ai-search/collect.ts
 *   SOAS_ONLY=postgres SOAS_ENGINES=chatgpt SOAS_LIMIT=1 bun ... collect.ts
 *
 * Needs AI_GATEWAY_API_KEY and SERPAPI_API_KEY.
 */
import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import { gateway, generateText } from "ai";

import { parseGoogleAiOverview } from "../../src/utils/geo-ai-overview";
import { REPORT_CATEGORIES } from "./categories";
import {
  ENGINE_MODELS,
  rawAnswerPath,
  REPORT_EDITION,
  REPORT_TODAY,
  type RawAnswer,
  type ReportEngine,
  SAMPLES_PER_ENGINE,
} from "./shared";

const CONCURRENCY = Number(process.env.SOAS_CONCURRENCY ?? 16);
const SERPAPI_RESERVE = 10;
const MAX_OUTPUT_TOKENS = 6000;

const SYSTEM = `You are a helpful assistant. Today's date is ${REPORT_TODAY}. Search the web when it helps you give a current, specific answer.`;

const only = process.env.SOAS_ONLY?.split(",");
const engines = (process.env.SOAS_ENGINES?.split(",") ?? [
  "chatgpt",
  "claude",
  "ai-overview",
]) as ReportEngine[];
const limit = Number(process.env.SOAS_LIMIT ?? Number.POSITIVE_INFINITY);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function exists(path: string): Promise<boolean> {
  try {
    await readFile(path);
    return true;
  } catch {
    return false;
  }
}

function domainOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

async function askModel(
  engine: "chatgpt" | "claude",
  prompt: string
): Promise<Pick<RawAnswer, "text" | "sources">> {
  const model = ENGINE_MODELS[engine];
  const tools =
    engine === "chatgpt"
      ? { web_search: openai.tools.webSearch({}) }
      : {
          web_search: anthropic.tools.webSearch_20250305({ maxUses: 5 }),
        };
  const result = await generateText({
    model: gateway(model),
    instructions: SYSTEM,
    prompt,
    tools,
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    providerOptions: {
      gateway: { tags: ["state-of-ai-search"] },
    },
  });
  const text = result.text.trim();
  if (!text) {
    throw new Error(`${engine} returned no text (${result.finishReason})`);
  }
  const seen = new Set<string>();
  const sources = result.sources.flatMap((source) => {
    if (source.sourceType !== "url" || seen.has(source.url)) {
      return [];
    }
    seen.add(source.url);
    const domain = domainOf(source.url);
    return domain
      ? [{ url: source.url, title: source.title ?? null, domain }]
      : [];
  });
  return { text, sources };
}

let serpApiCalls = 0;

async function serpApi(params: Record<string, string>): Promise<unknown> {
  const key = process.env.SERPAPI_API_KEY;
  if (!key) {
    throw new Error("SERPAPI_API_KEY is not set");
  }
  const url = new URL("https://serpapi.com/search.json");
  for (const [name, value] of Object.entries(params)) {
    url.searchParams.set(name, value);
  }
  url.searchParams.set("api_key", key);
  serpApiCalls += 1;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`SerpApi responded with ${response.status}`);
  }
  return response.json();
}

async function serpApiSearchesLeft(): Promise<number> {
  const response = await fetch(
    `https://serpapi.com/account.json?api_key=${process.env.SERPAPI_API_KEY}`
  );
  const account = (await response.json()) as { total_searches_left?: number };
  return account.total_searches_left ?? 0;
}

async function askAiOverview(
  prompt: string
): Promise<Pick<RawAnswer, "text" | "sources" | "present" | "overview">> {
  const first = await serpApi({
    engine: "google",
    q: prompt,
    hl: "en",
    gl: "us",
    device: "desktop",
  });
  let payload: unknown = first;
  const firstOverview = isRecord(first) ? first.ai_overview : undefined;
  if (isRecord(firstOverview) && typeof firstOverview.page_token === "string") {
    payload = await serpApi({
      engine: "google_ai_overview",
      page_token: firstOverview.page_token,
    });
  }
  const parsed = parseGoogleAiOverview(payload);
  if (parsed.status !== "present") {
    return { text: "", sources: [], present: false, overview: null };
  }
  const overview = isRecord(payload) ? payload.ai_overview : null;
  return {
    text: parsed.text,
    sources: parsed.sources.map((source) => ({
      url: source.url,
      title: source.title,
      domain: source.domain,
    })),
    present: true,
    overview: isRecord(overview)
      ? { text_blocks: overview.text_blocks, references: overview.references }
      : null,
  };
}

interface Job {
  category: string;
  promptIndex: number;
  prompt: string;
  engine: ReportEngine;
  sample: number;
  path: string;
}

async function runPool<T>(items: T[], worker: (item: T) => Promise<void>) {
  let next = 0;
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (next < items.length) {
        const item = items[next];
        next += 1;
        await worker(item);
      }
    })
  );
}

async function main() {
  const jobs: Job[] = [];
  for (const category of REPORT_CATEGORIES) {
    if (only && !only.includes(category.slug)) {
      continue;
    }
    for (const [promptIndex, prompt] of category.prompts.entries()) {
      if (promptIndex >= limit) {
        break;
      }
      for (const engine of engines) {
        for (let sample = 0; sample < SAMPLES_PER_ENGINE[engine]; sample += 1) {
          const path = rawAnswerPath(
            category.slug,
            engine,
            promptIndex,
            sample
          );
          if (!(await exists(path))) {
            jobs.push({
              category: category.slug,
              promptIndex,
              prompt,
              engine,
              sample,
              path,
            });
          }
        }
      }
    }
  }

  const overviewJobs = jobs.filter((job) => job.engine === "ai-overview");
  if (overviewJobs.length > 0) {
    const left = await serpApiSearchesLeft();
    console.log(
      `SerpApi searches left: ${left}, overview jobs: ${overviewJobs.length}`
    );
    if (left - overviewJobs.length * 2 < SERPAPI_RESERVE) {
      console.warn(
        "SerpApi budget may run out; overview jobs stop at the reserve."
      );
    }
  }

  console.log(
    `${jobs.length} answers to collect for edition ${REPORT_EDITION}`
  );
  let done = 0;
  let failed = 0;
  let serpApiLeft = Number.POSITIVE_INFINITY;
  if (overviewJobs.length > 0) {
    serpApiLeft = await serpApiSearchesLeft();
  }

  await runPool(jobs, async (job) => {
    try {
      if (
        job.engine === "ai-overview" &&
        serpApiLeft - serpApiCalls < SERPAPI_RESERVE
      ) {
        return;
      }
      const answer =
        job.engine === "ai-overview"
          ? await askAiOverview(job.prompt)
          : {
              ...(await askModel(job.engine, job.prompt)),
              present: true,
              overview: null,
            };
      const raw: RawAnswer = {
        category: job.category,
        promptIndex: job.promptIndex,
        prompt: job.prompt,
        engine: job.engine,
        model: ENGINE_MODELS[job.engine],
        sample: job.sample,
        collectedAt: new Date().toISOString(),
        ...answer,
      };
      await mkdir(dirname(job.path), { recursive: true });
      await writeFile(job.path, JSON.stringify(raw, null, 2));
      done += 1;
      if (done % 10 === 0) {
        console.log(
          `${done}/${jobs.length} (${failed} failed, ${serpApiCalls} SerpApi calls)`
        );
      }
    } catch (error) {
      failed += 1;
      console.error(
        `✗ ${job.category} ${job.engine} #${job.promptIndex}.${job.sample}:`,
        error instanceof Error ? error.message : error
      );
    }
  });

  console.log(
    `Done: ${done} collected, ${failed} failed, ${serpApiCalls} SerpApi calls`
  );
  console.log(
    `Raw answers in ${join(dirname(rawAnswerPath("x", "chatgpt", 0, 0)), "..", "..")}`
  );
}

await main();
