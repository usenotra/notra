import { db } from "@notra/db/drizzle";
import { geoCompetitors, geoSettings } from "@notra/db/schema";
import type { GeoCheckSource } from "@notra/db/types/geo-checks";
import { eq } from "drizzle-orm";
import { Effect, Layer } from "effect";

import { GEO_EXCERPT_MAX_LENGTH } from "../constants/geo";
import {
  GEO_DEMO_BRAND_TRAITS,
  GEO_DEMO_BRANDS_CACHE_MAX_ENTRIES,
  GEO_DEMO_BRANDS_CACHE_MS,
  GEO_DEMO_DEFAULT_MENTION_RATE,
  GEO_DEMO_PROFILE,
  GEO_DEMO_USAGE,
} from "../constants/geo-demo";
import { GEO_SAMPLE_ENGINES } from "../constants/geo-sample";
import { GeoModelService } from "../deps";
import type { GeoDemoBrands, GeoDemoJudgeInput } from "../types/geo-demo";
import { findBrandMention } from "../utils/geo-brand-mention";
import { hashInt, unit } from "../utils/geo-sample-hash";

const MAX_LISTED_BRANDS = 4;
const JUDGE_INPUT_PATTERN = /INPUT_JSON:\n(.+)\n/;

const brandsByOrganization = new Map<
  string,
  { loadedAt: number; brands: Promise<GeoDemoBrands> }
>();

/**
 * Brand and competitor names, cached briefly: a scan asks for them once per
 * answer, while a rename or new competitor should show up on the next scan.
 */
function loadBrands(organizationId: string): Promise<GeoDemoBrands> {
  const now = Date.now();
  const cached = brandsByOrganization.get(organizationId);
  if (cached && now - cached.loadedAt < GEO_DEMO_BRANDS_CACHE_MS) {
    return cached.brands;
  }
  const brands = Promise.all([
    db.query.geoSettings.findFirst({
      columns: { companyName: true },
      where: eq(geoSettings.organizationId, organizationId),
    }),
    db.query.geoCompetitors.findMany({
      columns: { name: true },
      where: eq(geoCompetitors.organizationId, organizationId),
    }),
  ]).then(([settings, competitors]) => ({
    companyName: settings?.companyName ?? "Fieldnote",
    competitors: competitors.map((competitor) => competitor.name),
  }));
  brands.catch(() => {
    if (brandsByOrganization.get(organizationId)?.brands === brands) {
      brandsByOrganization.delete(organizationId);
    }
  });
  brandsByOrganization.delete(organizationId);
  if (brandsByOrganization.size >= GEO_DEMO_BRANDS_CACHE_MAX_ENTRIES) {
    const oldest = brandsByOrganization.keys().next().value;
    if (oldest !== undefined) {
      brandsByOrganization.delete(oldest);
    }
  }
  brandsByOrganization.set(organizationId, { loadedAt: now, brands });
  return brands;
}

function mentionRate(engine: string): number {
  return (
    GEO_SAMPLE_ENGINES.find((candidate) => candidate.engine === engine)
      ?.mentionRate ?? GEO_DEMO_DEFAULT_MENTION_RATE
  );
}

/** Two to four consecutive sources, wrapping around the list. */
function pickSources(seed: string): GeoCheckSource[] {
  const { sources } = GEO_DEMO_PROFILE;
  const count = 2 + (hashInt(`${seed}:sources`) % 3);
  const offset = hashInt(`${seed}:offset`) % sources.length;
  return [...sources.slice(offset), ...sources.slice(0, offset)].slice(
    0,
    count
  );
}

/**
 * A believable assistant answer: a short ranked list of brands. Whether the
 * organization's own brand makes the list follows the engine's sample mention
 * rate, seeded by engine, prompt and day so a rerun on the same day agrees.
 */
function composeAnswer(
  brands: GeoDemoBrands,
  engine: string,
  prompt: string
): string {
  const day = new Date().toISOString().slice(0, 10);
  const seed = `${engine}:${prompt}:${day}`;
  const mentioned = unit(seed) < mentionRate(engine);
  const offset = hashInt(`${seed}:competitors`);
  const others = brands.competitors.length
    ? Array.from(
        { length: Math.min(MAX_LISTED_BRANDS, brands.competitors.length) },
        (_, index) =>
          brands.competitors[(offset + index) % brands.competitors.length] ?? ""
      )
    : [];
  const listed = [...new Set(others.filter(Boolean))].slice(
    0,
    mentioned ? MAX_LISTED_BRANDS - 1 : MAX_LISTED_BRANDS
  );
  if (mentioned) {
    const position = hashInt(`${seed}:position`) % (listed.length + 1);
    listed.splice(position, 0, brands.companyName);
  }

  const lines = listed.map((name, index) => {
    const trait =
      GEO_DEMO_BRAND_TRAITS[
        hashInt(`${seed}:${name}`) % GEO_DEMO_BRAND_TRAITS.length
      ];
    return `${index + 1}. **${name}**: ${trait}`;
  });
  const topic = prompt.replace(/[?.!]+$/u, "").toLowerCase();
  return `Here are solid options for "${topic}":\n\n${lines.join("\n")}\n\nThe right pick depends on whether you care most about search, integrations or price.`;
}

function parseJudgeInput(prompt: string): GeoDemoJudgeInput | null {
  const match = JUDGE_INPUT_PATTERN.exec(prompt);
  if (!match?.[1]) {
    return null;
  }
  try {
    return JSON.parse(match[1]) as GeoDemoJudgeInput;
  } catch {
    return null;
  }
}

function listPosition(answer: string, name: string): number | null {
  const lines = answer.split("\n").filter((line) => /^\d+\./.test(line));
  const index = lines.findIndex((line) => line.includes(`**${name}**`));
  return index === -1 ? null : index + 1;
}

/**
 * GEO model layer for the public demo: scans run through the real workflow,
 * but every engine answer, judgement and translation is produced locally.
 */
export const geoModelDemo = Layer.succeed(
  GeoModelService,
  GeoModelService.of({
    answer: Effect.fn("GeoModelDemo.answer")((input) =>
      Effect.promise(async () => {
        const brands = await loadBrands(input.organizationId);
        return {
          text: composeAnswer(brands, input.engine, input.prompt),
          grounding: { queries: [], sources: [] },
          sources: [],
          finishReason: "stop" as const,
          usage: GEO_DEMO_USAGE,
          zdrEnforced: null,
        };
      })
    ),
    groundedAnswer: Effect.fn("GeoModelDemo.groundedAnswer")((input) =>
      Effect.promise(async () => {
        const brands = await loadBrands(input.organizationId);
        const last = input.messages.at(-1);
        const prompt =
          typeof last?.content === "string" ? last.content : "your question";
        const sources = pickSources(`${input.engine.key}:${prompt}`);
        return {
          text: composeAnswer(brands, input.engine.model, prompt),
          grounding: { queries: [prompt.toLowerCase()], sources },
          sources: sources.map((source) => ({
            url: source.url,
            title: source.title,
          })),
          finishReason: "stop" as const,
          usage: GEO_DEMO_USAGE,
          zdrEnforced: null,
        };
      })
    ),
    judge: Effect.fn("GeoModelDemo.judge")((input) =>
      Effect.promise(async () => {
        const brands = await loadBrands(input.organizationId);
        const parsed = parseJudgeInput(input.prompt);
        const answer = parsed?.assistantAnswer ?? "";
        const companyName = parsed?.companyName ?? brands.companyName;
        const mentioned =
          findBrandMention(answer, companyName, parsed?.aliases ?? []) !== null;
        return {
          mentioned,
          position: mentioned ? listPosition(answer, companyName) : null,
          sentiment: mentioned ? ("positive" as const) : null,
          competitors: brands.competitors
            .filter((name) => answer.includes(name))
            .slice(0, MAX_LISTED_BRANDS),
          excerpt: answer.slice(0, GEO_EXCERPT_MAX_LENGTH),
          usage: GEO_DEMO_USAGE,
        };
      })
    ),
    evaluateMention: Effect.fn("GeoModelDemo.evaluateMention")((input) =>
      Effect.succeed({
        sentiment: "positive" as const,
        position: listPosition(input.answer, input.companyName),
        confidence: { sentiment: 0.9, position: 0.9 },
      })
    ),
    translate: Effect.fn("GeoModelDemo.translate")((input) =>
      Effect.succeed({
        translations: [...input.prompts],
        usage: GEO_DEMO_USAGE,
      })
    ),
    suggest: Effect.fn("GeoModelDemo.suggest")(() =>
      Effect.succeed({ prompts: [], usage: GEO_DEMO_USAGE })
    ),
  })
);
