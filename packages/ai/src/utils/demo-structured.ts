import { DEMO_BRAND_ANALYSIS } from "@notra/ai/constants/demo-responses";
import {
  DEMO_CONVERSATIONS,
  DEMO_DISCOVERY_COMPETITORS,
  DEMO_DISCOVERY_PROMPTS,
  DEMO_PERSONAS,
  DEMO_SENTIMENT_THEMES,
} from "@notra/ai/constants/demo-structured";
import type { DemoJsonSchema } from "@notra/ai/types/demo-model";
import { demoWriterBrief } from "@notra/ai/utils/demo-writer";

const URL_OR_DOMAIN =
  /\bhttps?:\/\/([a-z0-9.-]+\.[a-z]{2,})|\b([a-z0-9-]+\.(?:com|io|app|dev|ai|co|so|example|net|org|de))\b/i;
const DEMO_COMPANY = "Fieldnote";

function property(
  schema: DemoJsonSchema,
  key: string
): DemoJsonSchema | undefined {
  const value = schema.properties?.[key];
  return typeof value === "object" ? value : undefined;
}

function arrayBounds(schema: DemoJsonSchema | undefined) {
  return {
    min: schema?.minItems ?? 0,
    max: schema?.maxItems ?? Number.POSITIVE_INFINITY,
  };
}

function takeRotating<T>(items: readonly T[], count: number, seed: number) {
  return Array.from(
    { length: count },
    (_, index) => items[(seed + index) % items.length] as T
  );
}

function companyFromText(text: string): { name: string; domain: string } {
  const match = URL_OR_DOMAIN.exec(text);
  const domain = (match?.[1] ?? match?.[2] ?? "").replace(/^www\./, "");
  if (!domain || domain.endsWith(".example")) {
    return { name: DEMO_COMPANY, domain: "fieldnote.example" };
  }
  const label = domain.split(".")[0] ?? domain;
  return { name: label.charAt(0).toUpperCase() + label.slice(1), domain };
}

function personas(schema: DemoJsonSchema, text: string, seed: number) {
  const bounds = arrayBounds(property(schema, "personas"));
  const count = Math.min(
    Math.max(bounds.min, 1),
    bounds.max,
    DEMO_PERSONAS.length
  );
  // The prompt lists the project's current personas; prefer new archetypes
  // so regenerating or adding one never duplicates an existing persona.
  const fresh = DEMO_PERSONAS.filter((persona) => !text.includes(persona.name));
  const pool = fresh.length >= count ? fresh : DEMO_PERSONAS;
  return { personas: takeRotating(pool, count, seed) };
}

function conversations(schema: DemoJsonSchema, seed: number) {
  const bounds = arrayBounds(property(schema, "conversations"));
  const count = Math.min(bounds.max, 3, DEMO_CONVERSATIONS.length);
  return { conversations: takeRotating(DEMO_CONVERSATIONS, count, seed) };
}

function discovery(schema: DemoJsonSchema, text: string, seed: number) {
  const company = companyFromText(text);
  const promptBounds = arrayBounds(property(schema, "prompts"));
  const promptCount = Math.min(
    Math.max(promptBounds.min, 6),
    promptBounds.max,
    DEMO_DISCOVERY_PROMPTS.length
  );
  return {
    companyName: company.name,
    aliases: [company.name],
    audienceType: "general",
    competitors: DEMO_DISCOVERY_COMPETITORS.filter(
      (competitor) => competitor.name !== company.name
    ),
    prompts: DEMO_DISCOVERY_PROMPTS.slice(0, promptCount),
    conversations: conversations(schema, seed).conversations,
  };
}

const SENTENCE = /[^.!?]{8,240}[.!?]/g;

interface SentimentSampleAnswer {
  id: string;
  answer: string;
  sentiment: string | null;
}

function sentimentSample(text: string): SentimentSampleAnswer[] {
  const start = text.indexOf('{"brand"');
  if (start === -1) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(text.slice(start));
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("answers" in parsed) ||
      !Array.isArray(parsed.answers)
    ) {
      return [];
    }
    return parsed.answers.filter(
      (answer): answer is SentimentSampleAnswer =>
        typeof answer?.id === "string" && typeof answer?.answer === "string"
    );
  } catch {
    return [];
  }
}

/** Themes grounded in verbatim sentences, as the evidence filter requires. */
function sentimentThemes(text: string) {
  const sample = sentimentSample(text);
  const quotes = sample.flatMap((answer) =>
    (answer.answer.match(SENTENCE) ?? [])
      .slice(0, 2)
      .map((quote) => ({ checkId: answer.id, quote: quote.trim() }))
  );
  if (quotes.length === 0) {
    return { themes: [] };
  }
  return {
    themes: DEMO_SENTIMENT_THEMES.map((theme, index) => ({
      title: theme.title,
      polarity: theme.polarity,
      claims: [
        {
          statement: theme.statement,
          evidence: takeRotating(quotes, Math.min(2, quotes.length), index * 2),
        },
      ],
    })),
  };
}

/**
 * A coherent answer for structured calls the generic faker gets wrong, picked
 * by the shape of the requested schema; undefined means "use the faker".
 */
export function demoStructuredOutput(
  schema: DemoJsonSchema,
  promptText: string,
  seed: number
): unknown {
  const keys = new Set(Object.keys(schema.properties ?? {}));
  if (keys.has("themes") && keys.size === 1) {
    return sentimentThemes(promptText);
  }
  if (keys.has("workingTitle") && keys.has("sections")) {
    return demoWriterBrief(promptText);
  }
  if (keys.has("personas")) {
    return personas(schema, promptText, seed);
  }
  if (keys.has("companyName") && keys.has("aliases") && keys.has("prompts")) {
    return discovery(schema, promptText, seed);
  }
  if (keys.has("conversations") && keys.size === 1) {
    return conversations(schema, seed);
  }
  return undefined;
}

/** Brand analysis keeps faked keys but gets a coherent profile. */
export function withDemoBrandAnalysis(value: unknown): unknown {
  if (
    typeof value !== "object" ||
    value === null ||
    !("companyDescription" in value && "audience" in value)
  ) {
    return value;
  }
  const merged: Record<string, unknown> = { ...value };
  for (const [key, cannedValue] of Object.entries(DEMO_BRAND_ANALYSIS)) {
    if (key in merged) {
      merged[key] = cannedValue;
    }
  }
  return merged;
}
