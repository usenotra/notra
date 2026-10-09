import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { anthropic } from "@ai-sdk/anthropic";
/**
 * Collects answers for the public "State of AI Search" reports.
 *
 * Asks every prompt of every category to ChatGPT, Claude, grounded Gemini
 * and Perplexity, and fetches Google's AI Overview through
 * SerpApi. Raw answers are cached per prompt, engine and sample, so a rerun
 * only fills the gaps and `build.ts` can re-aggregate for free.
 *
 *   bun --env-file=../../.env run packages/geo-core/scripts/state-of-ai-search/collect.ts
 *   SOAS_ONLY=postgres SOAS_ENGINES=chatgpt SOAS_LIMIT=1 bun ... collect.ts
 *
 * Needs AI_GATEWAY_API_KEY and SERPAPI_API_KEY.
 */
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { gateway, generateText } from "ai";

import { extractGrounding } from "../../src/geo/grounding";
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
import { resolveGroundedSources } from "./utils/grounded-sources";

const CONCURRENCY = Number(process.env.SOAS_CONCURRENCY ?? 16);
const SERPAPI_RESERVE = 10;
const MAX_OUTPUT_TOKENS = 6000;

const SYSTEM = `You are a helpful assistant. Today's date is ${REPORT_TODAY}. Search the web when it helps you give a current, specific answer.`;

const only = process.env.SOAS_ONLY?.split(",");
const engines = (process.env.SOAS_ENGINES?.split(",") ?? [
  "chatgpt",
  "claude",
  "gemini",
  "perplexity",
  "ai-overview",
]) as ReportEngine[];
const start = Number(process.env.SOAS_START ?? 0);
const sampleLimit = Number(
  process.env.SOAS_SAMPLES ?? Number.POSITIVE_INFINITY
);
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

async function askModel(
  engine: Exclude<ReportEngine, "ai-overview">,
  prompt: string
): Promise<
  Pick<
    RawAnswer,
    "text" | "sources" | "searchQueries" | "billing" | "providerMetadata"
  >
> {
  const model = ENGINE_MODELS[engine];
  const tools = {} as Record<
    string,
    | ReturnType<typeof openai.tools.webSearch>
    | ReturnType<typeof anthropic.tools.webSearch_20250305>
    | ReturnType<typeof google.tools.googleSearch>
  >;
  if (engine === "chatgpt") {
    tools.web_search = openai.tools.webSearch({});
  }
  if (engine === "claude") {
    tools.web_search = anthropic.tools.webSearch_20250305({ maxUses: 5 });
  }
  if (engine === "gemini") {
    tools.google_search = google.tools.googleSearch({});
  }
  const result = await generateText({
    model: gateway(model),
    instructions:
      engine === "gemini"
        ? `${SYSTEM} Always use Google Search to verify current providers and cite your sources before answering.`
        : SYSTEM,
    prompt,
    tools,
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    maxRetries: 3,
    abortSignal: AbortSignal.timeout(240_000),
    providerOptions: {
      gateway: { tags: ["state-of-ai-search"] },
    },
  });
  const text = result.text.trim();
  if (!text) {
    throw new Error(`${engine} returned no text (${result.finishReason})`);
  }
  const grounding = extractGrounding(result);
  const body = isRecord(result.response.body) ? result.response.body : {};
  const searchResults = Array.isArray(body.search_results)
    ? body.search_results
    : [];
  const sources = grounding.sources.map((source) => {
    const match = searchResults.find(
      (item) => isRecord(item) && item.url === source.url
    );
    return {
      ...source,
      title:
        isRecord(match) && typeof match.title === "string"
          ? match.title
          : source.title,
    };
  });
  const searchQueries = [
    ...new Set([...grounding.queries, ...readSearchQueries(result.steps)]),
  ];
  // Perplexity exposes citations and search counts, but not necessarily query strings.
  // Preserve an empty query list rather than pretending the user prompt was a search.
  const metadata = result.providerMetadata ?? {};
  const gatewayMetadata = isRecord(metadata.gateway) ? metadata.gateway : {};
  const perplexityMetadata = isRecord(metadata.perplexity)
    ? metadata.perplexity
    : {};
  const perplexityCost = isRecord(perplexityMetadata.cost)
    ? perplexityMetadata.cost.totalCost
    : undefined;
  const reportedCost = Number(
    gatewayMetadata.gatewayCost ?? gatewayMetadata.cost ?? perplexityCost
  );
  const routing = isRecord(gatewayMetadata.routing)
    ? gatewayMetadata.routing
    : {};
  const attempts = Array.isArray(routing.modelAttempts)
    ? routing.modelAttempts
    : [];
  const successfulProvider = attempts
    .flatMap((attempt) =>
      isRecord(attempt) && Array.isArray(attempt.providerAttempts)
        ? attempt.providerAttempts
        : []
    )
    .findLast((attempt) => isRecord(attempt) && attempt.success === true);
  const byok =
    isRecord(successfulProvider) &&
    successfulProvider.credentialType === "byok";
  const externalCost = byok ? Number(gatewayMetadata.marketCost ?? 0) : 0;
  const inputTokens = result.totalUsage.inputTokens ?? 0;
  const outputTokens = result.totalUsage.outputTokens ?? 0;
  const price = prices.get(model);
  // Fallback includes the maximum configured search calls, conservatively.
  const estimatedCost =
    inputTokens * Number(price?.input ?? 0) +
    outputTokens * Number(price?.output ?? 0) +
    (5 * Number(price?.web_search ?? 0)) / 1000;
  const billing = {
    cost: Number.isFinite(reportedCost)
      ? reportedCost + externalCost
      : estimatedCost,
    inputTokens,
    outputTokens,
    reported: Number.isFinite(reportedCost),
  };
  spend += billing.cost;
  await appendFile(
    spendPath,
    `${JSON.stringify({
      cost: billing.cost,
      engine,
      collectedAt: new Date().toISOString(),
    })}\n`
  );
  return {
    text,
    sources: await resolveGroundedSources(sources),
    searchQueries,
    billing,
    providerMetadata: metadata,
  };
}

/**
 * Queries the model sent to its web search tool. OpenAI reports them on the
 * tool result (`action.query` / `action.queries`), Anthropic on the call input.
 */
function readSearchQueries(steps: readonly { content: readonly unknown[] }[]) {
  const queries = new Set<string>();
  const add = (value: unknown) => {
    if (typeof value === "string" && value.trim()) {
      queries.add(value.trim());
    }
  };
  for (const part of steps.flatMap((step) => step.content)) {
    if (!isRecord(part)) {
      continue;
    }
    if (part.type === "tool-call" && isRecord(part.input)) {
      add(part.input.query);
    }
    if (part.type === "tool-result" && isRecord(part.output)) {
      const action = isRecord(part.output.action) ? part.output.action : {};
      add(action.query);
      if (Array.isArray(action.queries)) {
        action.queries.forEach(add);
      }
    }
  }
  return [...queries];
}

let serpApiCalls = 0;
let serpApiLeft = Number.POSITIVE_INFINITY;
const budget = Math.min(400, Number(process.env.SOAS_BUDGET ?? 400));
const spendPath = join(
  dirname(dirname(rawAnswerPath("x", "chatgpt", 0, 0))),
  "..",
  "gateway-spend.jsonl"
);
let spend = 0;
let reserved = 0;
const prices = new Map<string, Record<string, string>>();
// Reserve enough for a 6k-token answer plus search input; stop before $400.
const requestReserve: Record<Exclude<ReportEngine, "ai-overview">, number> = {
  chatgpt: 1,
  claude: 1,
  gemini: 0.25,
  perplexity: 0.15,
};

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
  if (serpApiLeft - serpApiCalls <= SERPAPI_RESERVE) {
    throw new Error("SerpApi reserve reached");
  }
  serpApiCalls += 1;
  const response = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  if (!response.ok) {
    throw new Error(`SerpApi responded with ${response.status}`);
  }
  return response.json();
}

async function serpApiSearchesLeft(): Promise<number> {
  const response = await fetch(
    `https://serpapi.com/account.json?api_key=${process.env.SERPAPI_API_KEY}`
  );
  if (!response.ok) {
    throw new Error(`SerpApi account responded with ${response.status}`);
  }
  const account = (await response.json()) as { total_searches_left?: number };
  return account.total_searches_left ?? 0;
}

async function askAiOverview(
  prompt: string
): Promise<
  Pick<RawAnswer, "text" | "sources" | "searchQueries" | "present" | "overview">
> {
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
  if (parsed.status === "invalid") {
    // A failed or malformed response is not an absence: throw so the retry
    // path asks again instead of caching a miss.
    throw new Error(`SerpApi returned an invalid AI Overview for "${prompt}"`);
  }
  if (parsed.status !== "present") {
    return {
      text: "",
      sources: [],
      searchQueries: [],
      present: false,
      overview: null,
    };
  }
  const overview = isRecord(payload) ? payload.ai_overview : null;
  return {
    text: parsed.text,
    sources: parsed.sources.map((source) => ({
      url: source.url,
      title: source.title,
      domain: source.domain,
    })),
    searchQueries: [],
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

async function runPool<T>(
  items: T[],
  worker: (item: T) => Promise<void>,
  concurrency = CONCURRENCY
) {
  let next = 0;
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (next < items.length) {
        const item = items[next];
        next += 1;
        if (item !== undefined) {
          await worker(item);
        }
      }
    })
  );
}

/** Cost of one ledger line; blank or half-written lines count as zero. */
function readLedgerCost(line: string): number {
  try {
    const entry: unknown = JSON.parse(line);
    return isRecord(entry) &&
      typeof entry.cost === "number" &&
      Number.isFinite(entry.cost)
      ? entry.cost
      : 0;
  } catch {
    return 0;
  }
}

async function main() {
  await mkdir(dirname(spendPath), { recursive: true });
  try {
    spend = (await readFile(spendPath, "utf8"))
      .split("\n")
      .reduce((sum, line) => sum + readLedgerCost(line), 0);
  } catch (error) {
    if (!isRecord(error) || error.code !== "ENOENT") {
      throw error;
    }
  }
  const catalog = (await (
    await fetch("https://ai-gateway.vercel.sh/v1/models")
  ).json()) as { data: { id: string; pricing: Record<string, string> }[] };
  for (const model of catalog.data) {
    prices.set(model.id, model.pricing);
  }
  const jobs: Job[] = [];
  for (const category of REPORT_CATEGORIES) {
    if (only && !only.includes(category.slug)) {
      continue;
    }
    for (const [promptIndex, prompt] of category.prompts.entries()) {
      if (promptIndex < start) {
        continue;
      }
      if (promptIndex >= start + limit) {
        break;
      }
      for (const engine of engines) {
        for (
          let sample = 0;
          sample < Math.min(sampleLimit, SAMPLES_PER_ENGINE[engine]);
          sample += 1
        ) {
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

  // Fill lower sample indices across categories first if a budget-limited rerun is needed.
  jobs.sort((a, b) => a.sample - b.sample || a.promptIndex - b.promptIndex);
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
  if (overviewJobs.length > 0) {
    serpApiLeft = await serpApiSearchesLeft();
  }
  const failures: Job[] = [];
  let skipped = 0;
  const worker = async (job: Job) => {
    if (
      job.engine === "ai-overview" &&
      serpApiLeft - serpApiCalls < SERPAPI_RESERVE + 2
    ) {
      skipped += 1;
      return;
    }
    const hold = job.engine === "ai-overview" ? 0 : requestReserve[job.engine];
    if (hold && spend + reserved + hold > budget) {
      skipped += 1;
      return;
    }
    reserved += hold;
    try {
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
      await writeFile(job.path, JSON.stringify(raw, null, 2), { flag: "wx" });
      done += 1;
      if (done % 25 === 0) {
        console.log(
          `${done}/${jobs.length}, charged/estimated $${spend.toFixed(2)}, ${serpApiCalls} SerpApi calls`
        );
      }
    } catch (error) {
      // Conservatively account for potentially billed requests without a response.
      spend += hold;
      await appendFile(
        spendPath,
        `${JSON.stringify({
          cost: hold,
          engine: job.engine,
          estimatedFailure: true,
          collectedAt: new Date().toISOString(),
        })}\n`
      );
      failures.push(job);
      console.error(
        `Failed ${job.category} ${job.engine} #${job.promptIndex}.${job.sample}: ${error instanceof Error ? error.message : "request failed"}`
      );
    } finally {
      reserved -= hold;
    }
  };
  await runPool(
    jobs.filter((job) => job.engine !== "ai-overview"),
    worker
  );
  // Serial Google requests avoid the free-plan two-request concurrency ceiling.
  await runPool(
    overviewJobs.sort((a, b) => a.promptIndex - b.promptIndex),
    worker,
    1
  );
  for (let round = 0; round < 2 && failures.length > 0; round += 1) {
    const retry = failures.splice(0);
    console.log(`Retry round ${round + 1}: ${retry.length} failed answers`);
    await new Promise((resolve) => setTimeout(resolve, 2000 * 2 ** round));
    await runPool(
      retry.filter((job) => job.engine !== "ai-overview"),
      worker
    );
    await runPool(
      retry.filter((job) => job.engine === "ai-overview"),
      worker,
      1
    );
  }
  failed = failures.length;
  console.log(
    `Done: ${done} collected, ${failed} failed, ${skipped} budget/reserve skips, ${serpApiCalls} SerpApi calls; cumulative gateway charge/estimate $${spend.toFixed(2)}`
  );
  if (failed > 0) {
    process.exitCode = 1;
  }
  console.log(
    `Raw answers in ${join(dirname(rawAnswerPath("x", "chatgpt", 0, 0)), "..", "..")}`
  );
}

await main();
