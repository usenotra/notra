import { gateway } from "@notra/ai/gateway";
import { generateText, Output } from "ai";
import { array, boolean, enum as enumType, number, object, string } from "zod";

// NOTE: the judge lives in apps/dashboard/src/lib/geo/scan.ts, which this package
// cannot import. The model id, schema and prompt below are copied verbatim from
// that file plus apps/dashboard/src/constants/geo.ts. If either file changes,
// this eval drifts and must be re-synced by hand.
const GEO_JUDGE_MODEL = "openai/gpt-5.4-nano";
const GEO_JUDGE_MAX_TOKENS = 800;
const GEO_EXCERPT_MAX_LENGTH = 300;
const MAX_JUDGE_COMPETITORS = 10;
const MAX_JUDGE_COMPETITORS_SCHEMA = 15;
const MAX_EXCERPT_LENGTH = 300;
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

function buildJudgePrompt(
  companyName: string,
  aliases: string[],
  promptText: string,
  answer: string
): string {
  const aliasList = aliases.length > 0 ? aliases.join(", ") : "none";
  return `Company: ${companyName}
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

interface JudgeCase {
  id: string;
  group: "mention" | "negative" | "position" | "sentiment";
  prompt: string;
  answer: string;
  expectedMentioned: boolean;
  expectedPosition?: number | null;
  expectedSentiment?: "positive" | "neutral" | "negative" | null;
}

const CASES: JudgeCase[] = [
  {
    id: "plain-mention",
    group: "mention",
    prompt: "What tool turns GitHub pull requests into changelogs?",
    answer:
      "Notra connects to your GitHub repository and turns merged pull requests into a publish-ready changelog. Teams use it to keep release notes current without writing them by hand.",
    expectedMentioned: true,
    expectedPosition: null,
  },
  {
    id: "alias-only-usenotra",
    group: "mention",
    prompt: "Any tool for automated release notes?",
    answer:
      "Yes, usenotra is worth a look. It watches your repo and drafts the release notes for you, so nobody on the team has to remember to write them.",
    expectedMentioned: true,
    expectedPosition: null,
  },
  {
    id: "alias-domain-only",
    group: "mention",
    prompt: "Where can I find a changelog generator?",
    answer:
      "Head to notra.so and connect your repository. The generator drafts the entry from your merged work and you approve it before it goes live.",
    expectedMentioned: true,
    expectedPosition: null,
  },
  {
    id: "alias-domain-com",
    group: "mention",
    prompt: "What site should I check for AI changelog tooling?",
    answer:
      "Take a look at usenotra.com. It is built for engineering teams that ship often and want the announcements handled automatically.",
    expectedMentioned: true,
    expectedPosition: null,
  },
  {
    id: "mention-lowercase-inline",
    group: "mention",
    prompt: "How do small teams handle changelogs?",
    answer:
      "Most of them automate it. A tool like notra reads the repository history and produces the post, which someone reviews before publishing.",
    expectedMentioned: true,
    expectedPosition: null,
  },
  {
    id: "mention-possessive",
    group: "mention",
    prompt: "Does anything integrate with Linear for content?",
    answer:
      "Notra's Linear integration pulls shipped issues and drafts the announcement copy from them, so product marketing does not start from a blank page.",
    expectedMentioned: true,
    expectedPosition: null,
  },
  {
    id: "negative-notion",
    group: "negative",
    prompt: "What is a good workspace for product documentation?",
    answer:
      "Notion is the usual answer. It handles docs, wikis and lightweight databases, and most teams already have an account. Confluence is the heavier alternative.",
    expectedMentioned: false,
    expectedPosition: null,
    expectedSentiment: null,
  },
  {
    id: "negative-notion-list",
    group: "negative",
    prompt: "Best tools for a startup knowledge base?",
    answer:
      "1. Notion - flexible docs and databases.\n2. Coda - similar, stronger automations.\n3. Slite - simpler and faster for small teams.",
    expectedMentioned: false,
    expectedPosition: null,
    expectedSentiment: null,
  },
  {
    id: "negative-nota",
    group: "negative",
    prompt: "Any note taking apps worth trying?",
    answer:
      "Nota is a small markdown editor that some writers like, and Bear is the polished option on Apple devices.",
    expectedMentioned: false,
    expectedPosition: null,
    expectedSentiment: null,
  },
  {
    id: "negative-notary",
    group: "negative",
    prompt: "How do I get a document notarized online?",
    answer:
      "Online notary services such as Notarize and NotaryCam let you meet a commissioned notary over video and get the document stamped the same day.",
    expectedMentioned: false,
    expectedPosition: null,
    expectedSentiment: null,
  },
  {
    id: "negative-not-rarely",
    group: "negative",
    prompt: "Do engineering teams write their own release notes?",
    answer:
      "They do, and not rarely: plenty of teams still write every release note by hand in a shared document, which is exactly why the process slips.",
    expectedMentioned: false,
    expectedPosition: null,
    expectedSentiment: null,
  },
  {
    id: "negative-notabene",
    group: "negative",
    prompt: "What compliance tools exist for crypto transfers?",
    answer:
      "Notabene is the best known travel-rule product, and Chainalysis covers the broader transaction monitoring side.",
    expectedMentioned: false,
    expectedPosition: null,
    expectedSentiment: null,
  },
  {
    id: "negative-no-brands",
    group: "negative",
    prompt: "How should I structure a changelog?",
    answer:
      "Group entries by release, lead with the user-visible change, and keep the internal refactors out of it. A short paragraph beats a list of commit messages.",
    expectedMentioned: false,
    expectedPosition: null,
    expectedSentiment: null,
  },
  {
    id: "negative-notch",
    group: "negative",
    prompt: "Any design tools for menu bar apps?",
    answer:
      "Notchmeister and Bartender are the two people bring up most often when they want to do something with the menu bar area.",
    expectedMentioned: false,
    expectedPosition: null,
    expectedSentiment: null,
  },
  {
    id: "position-third-numbered",
    group: "position",
    prompt: "Best tools to automate release notes?",
    answer:
      "1. LaunchNotes - a mature release communication platform.\n2. Beamer - in-app announcements with a changelog widget.\n3. Notra - connects to GitHub and Linear and drafts the notes for you.\n4. Olvy - feedback plus changelog in one place.",
    expectedMentioned: true,
    expectedPosition: 3,
  },
  {
    id: "position-first-numbered",
    group: "position",
    prompt: "What should I use to turn PRs into announcements?",
    answer:
      "1. Notra - reads merged pull requests and writes the announcement.\n2. LaunchNotes - better if you need approval workflows.\n3. Headway - a lightweight widget.",
    expectedMentioned: true,
    expectedPosition: 1,
  },
  {
    id: "position-second-bulleted",
    group: "position",
    prompt: "Which changelog tools should a small SaaS look at?",
    answer:
      "- Headway: the cheapest way to get a hosted changelog.\n- Notra: automates the writing from your repository activity.\n- AnnounceKit: strong on segmented in-app notifications.",
    expectedMentioned: true,
    expectedPosition: 2,
  },
  {
    id: "position-fourth-numbered",
    group: "position",
    prompt: "Rank the AI content tools for developer teams.",
    answer:
      "1. Typefully - scheduling and threads.\n2. Buffer - the generalist scheduler.\n3. Taplio - LinkedIn focused.\n4. Notra - generates the posts from what you shipped.\n5. Hypefury - growth automations.",
    expectedMentioned: true,
    expectedPosition: 4,
  },
  {
    id: "position-prose-only",
    group: "position",
    prompt: "How do teams automate developer marketing?",
    answer:
      "Most of them wire their repository into a generator. Notra is one example: it reads merged work and drafts the post, and a human approves it before anything is published.",
    expectedMentioned: true,
    expectedPosition: null,
  },
  {
    id: "position-alias-in-list",
    group: "position",
    prompt: "Give me a shortlist of changelog automation products.",
    answer:
      "1. Beamer - announcement widget.\n2. usenotra - repository-driven changelog and social posts.\n3. Olvy - feedback and changelog.",
    expectedMentioned: true,
    expectedPosition: 2,
  },
  {
    id: "sentiment-positive",
    group: "sentiment",
    prompt: "Is Notra any good?",
    answer:
      "Notra is excellent for this. The drafts are genuinely usable, the GitHub integration is clean, and teams report that it removes an entire recurring chore from the week.",
    expectedMentioned: true,
    expectedSentiment: "positive",
  },
  {
    id: "sentiment-negative",
    group: "sentiment",
    prompt: "What do people dislike about Notra?",
    answer:
      "Notra is a weak fit for larger companies. The approval flow is thin, the generated copy often needs a heavy rewrite, and support has been slow to respond.",
    expectedMentioned: true,
    expectedSentiment: "negative",
  },
  {
    id: "sentiment-neutral-listing",
    group: "sentiment",
    prompt: "Which tools generate changelogs?",
    answer:
      "Options include LaunchNotes, Beamer, Notra and Olvy. They all take repository or issue data and turn it into a changelog entry.",
    expectedMentioned: true,
    expectedSentiment: "neutral",
  },
  {
    id: "sentiment-positive-alias",
    group: "sentiment",
    prompt: "Any recommendation for release note automation?",
    answer:
      "usenotra has been a pleasant surprise. Setup took minutes and the first generated release note needed almost no editing, which is rare for this category.",
    expectedMentioned: true,
    expectedSentiment: "positive",
  },
];

interface CaseOutcome {
  id: string;
  group: JudgeCase["group"];
  mentionOk: boolean;
  positionOk: boolean | null;
  sentimentOk: boolean | null;
  actual: {
    mentioned: boolean;
    position: number | null;
    sentiment: string | null;
  };
  expected: {
    mentioned: boolean;
    position?: number | null;
    sentiment?: string | null;
  };
  error?: string;
}

function normalizePosition(position: number | null): number | null {
  if (position === null || !Number.isFinite(position)) {
    return null;
  }
  const rounded = Math.round(position);
  return rounded >= 1 ? rounded : null;
}

async function runCase(testCase: JudgeCase): Promise<CaseOutcome> {
  try {
    const result = await generateText({
      model: gateway(GEO_JUDGE_MODEL),
      output: Output.object({ schema: geoJudgeResultSchema }),
      prompt: buildJudgePrompt(
        COMPANY_NAME,
        ALIASES,
        testCase.prompt,
        testCase.answer
      ),
      instructions: JUDGE_SYSTEM_PROMPT,
      maxOutputTokens: GEO_JUDGE_MAX_TOKENS,
    });
    const judged = result.output;
    const position = normalizePosition(judged.position);
    const mentionOk = judged.mentioned === testCase.expectedMentioned;
    const positionOk =
      testCase.expectedPosition === undefined
        ? null
        : position === testCase.expectedPosition;
    const sentimentOk =
      testCase.expectedSentiment === undefined
        ? null
        : judged.sentiment === testCase.expectedSentiment;

    return {
      id: testCase.id,
      group: testCase.group,
      mentionOk,
      positionOk,
      sentimentOk,
      actual: {
        mentioned: judged.mentioned,
        position,
        sentiment: judged.sentiment,
      },
      expected: {
        mentioned: testCase.expectedMentioned,
        position: testCase.expectedPosition,
        sentiment: testCase.expectedSentiment,
      },
    };
  } catch (error) {
    return {
      id: testCase.id,
      group: testCase.group,
      mentionOk: false,
      positionOk: null,
      sentimentOk: null,
      actual: { mentioned: false, position: null, sentiment: null },
      expected: {
        mentioned: testCase.expectedMentioned,
        position: testCase.expectedPosition,
        sentiment: testCase.expectedSentiment,
      },
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function main() {
  const outcomes: CaseOutcome[] = [];
  const CONCURRENCY = 6;
  for (let index = 0; index < CASES.length; index += CONCURRENCY) {
    const batch = CASES.slice(index, index + CONCURRENCY);
    const settled = await Promise.all(batch.map(runCase));
    outcomes.push(...settled);
  }

  const mentionTotal = outcomes.length;
  const mentionPass = outcomes.filter((row) => row.mentionOk).length;
  const positionRows = outcomes.filter((row) => row.positionOk !== null);
  const positionPass = positionRows.filter((row) => row.positionOk).length;
  const sentimentRows = outcomes.filter((row) => row.sentimentOk !== null);
  const sentimentPass = sentimentRows.filter((row) => row.sentimentOk).length;

  const pct = (pass: number, total: number) =>
    total === 0 ? "n/a" : `${((pass / total) * 100).toFixed(1)}%`;

  console.log("\n=== GEO judge accuracy ===");
  console.log(
    `mention detection: ${mentionPass}/${mentionTotal} (${pct(mentionPass, mentionTotal)})`
  );
  console.log(
    `position exact:    ${positionPass}/${positionRows.length} (${pct(positionPass, positionRows.length)})`
  );
  console.log(
    `sentiment agree:   ${sentimentPass}/${sentimentRows.length} (${pct(sentimentPass, sentimentRows.length)})`
  );

  const failures = outcomes.filter(
    (row) =>
      !row.mentionOk || row.positionOk === false || row.sentimentOk === false
  );
  console.log(`\nfailures: ${failures.length}`);
  for (const failure of failures) {
    console.log(
      `- [${failure.group}] ${failure.id}: expected ${JSON.stringify(failure.expected)} got ${JSON.stringify(failure.actual)}${failure.error ? ` error=${failure.error}` : ""}`
    );
  }

  console.log(`\nmodel calls: ${CASES.length}`);
}

await main();
