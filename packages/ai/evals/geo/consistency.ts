import { gateway } from "@notra/ai/gateway";
import { generateText, Output } from "ai";
import { array, boolean, enum as enumType, number, object, string } from "zod";

// Mirrors packages/geo-core/src/geo/scan.ts (ask + judge) and
// packages/geo-core/src/constants/geo.ts. Re-sync by hand if either changes.
const ENGINE = "google/gemini-3-flash";
const GEO_JUDGE_MODEL = "openai/gpt-5.4-nano";
const GEO_ANSWER_MAX_TOKENS = 4096;
const GEO_JUDGE_MAX_TOKENS = 800;
const GEO_EXCERPT_MAX_LENGTH = 300;
const MAX_JUDGE_COMPETITORS = 10;
const MAX_JUDGE_COMPETITORS_SCHEMA = 15;
const MAX_EXCERPT_LENGTH = 300;
const RUNS_PER_PROMPT = 3;
const GEO_ANSWER_SYSTEM_PROMPT =
  "You are a helpful AI assistant. Answer the user's question directly and concretely, naming specific products or companies where relevant. Do not use em dashes.";
const JUDGE_SYSTEM_PROMPT =
  "You analyze AI assistant answers for brand mentions. Respond only with the requested structured data.";

const geoJudgeResultSchema = object({
  mentioned: boolean(),
  position: number().nullable(),
  sentiment: enumType(["positive", "neutral", "negative"]).nullable(),
  competitors: array(string()).max(MAX_JUDGE_COMPETITORS_SCHEMA),
  excerpt: string().max(MAX_EXCERPT_LENGTH),
});

const COMPANY_NAME = "Notra";
const ALIASES = [
  "usenotra",
  "notra.so",
  "Notra AI",
  "usenotra.com",
  "notra.app",
];

const PROMPTS = [
  "What is the best tool to automatically generate changelogs from GitHub pull requests?",
  "What tools turn merged PRs into publish-ready release notes automatically?",
  "Is there a way to auto-generate social media posts from my team's shipped features?",
  "What AI tools help product teams write launch announcements from their development activity?",
];

function buildJudgePrompt(promptText: string, answer: string): string {
  const aliasList = ALIASES.join(", ");
  return `Company: ${COMPANY_NAME}
Known aliases (any of these counts as a mention): ${aliasList}

A user asked an AI assistant:
"""
${promptText}
"""

The assistant answered:
"""
${answer}
"""

Analyze the answer and report:
- mentioned: true if the company or any alias appears in the answer.
- position: the 1-based rank of the company among the recommended brands if the answer contains an ordered or bulleted list of brands, otherwise null.
- sentiment: the sentiment expressed toward the company ("positive", "neutral" or "negative"), or null if it is not mentioned.
- competitors: up to ${MAX_JUDGE_COMPETITORS} other brand or product names mentioned in the answer, excluding the company and its aliases.
- excerpt: at most ${GEO_EXCERPT_MAX_LENGTH} characters of the answer around the mention, or the first 200 characters of the answer if the company is not mentioned.`;
}

async function askAndJudge(
  promptText: string
): Promise<{ mentioned: boolean; position: number | null }> {
  const answer = await generateText({
    model: gateway(ENGINE),
    prompt: promptText,
    system: GEO_ANSWER_SYSTEM_PROMPT,
    maxOutputTokens: GEO_ANSWER_MAX_TOKENS,
  });
  const judged = await generateText({
    model: gateway(GEO_JUDGE_MODEL),
    output: Output.object({ schema: geoJudgeResultSchema }),
    prompt: buildJudgePrompt(promptText, answer.text),
    system: JUDGE_SYSTEM_PROMPT,
    maxOutputTokens: GEO_JUDGE_MAX_TOKENS,
  });
  return {
    mentioned: judged.output.mentioned,
    position: judged.output.position,
  };
}

async function main() {
  let unanimous = 0;
  for (const promptText of PROMPTS) {
    const runs = await Promise.all(
      Array.from({ length: RUNS_PER_PROMPT }, () => askAndJudge(promptText))
    );
    const verdicts = runs.map((run) => run.mentioned);
    const agree = verdicts.every((value) => value === verdicts[0]);
    if (agree) {
      unanimous += 1;
    }
    console.log(
      `\n${promptText}\n  verdicts: ${JSON.stringify(verdicts)} positions: ${JSON.stringify(runs.map((run) => run.position))} ${agree ? "AGREE" : "SPLIT"}`
    );
  }
  console.log(
    `\nunanimous prompts: ${unanimous}/${PROMPTS.length}; model calls: ${PROMPTS.length * RUNS_PER_PROMPT * 2}`
  );
}

await main();
