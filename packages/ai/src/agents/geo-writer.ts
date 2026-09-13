import {
  GEO_WRITER_HUMANIZER_MAX_TOKENS,
  GEO_WRITER_MAX_STEPS,
  GEO_WRITER_MODEL,
  GEO_WRITER_PLANNER_MAX_TOKENS,
  GEO_WRITER_PLANNER_REPAIR_ATTEMPTS,
  GEO_WRITER_PLANNER_TEMPERATURE,
} from "@notra/ai/constants/models";
import { assertRouteHasCredits } from "@notra/ai/gateway";
import { createModel } from "@notra/ai/model";
import {
  buildGeoHumanizerPrompt,
  GEO_HUMANIZER_SYSTEM,
} from "@notra/ai/prompts/geo_writer/humanizer";
import {
  buildGeoPlannerPrompt,
  buildGeoPlannerRepairPrompt,
  buildGeoPlannerSystem,
} from "@notra/ai/prompts/geo_writer/planner";
import { buildGeoWriterInstructions } from "@notra/ai/prompts/geo_writer/writer";
import { withRouterDefaults } from "@notra/ai/provider-options";
import { geoContentBriefSchema } from "@notra/ai/schemas/geo-writer";
import {
  createGetBrandReferencesTool,
  createSearchBrandReferencesTool,
} from "@notra/ai/tools/brand-references";
import { createGetGeoContextTool } from "@notra/ai/tools/geo-context";
import {
  createCreatePostTool,
  createFailTool,
  createViewPostTool,
} from "@notra/ai/tools/post";
import {
  createFetchSitemapPageTool,
  createGetSitemapPagesTool,
} from "@notra/ai/tools/sitemap";
import { getSkillByName, listAvailableSkills } from "@notra/ai/tools/skills";
import type { AgentTokenUsage } from "@notra/ai/types/agents";
import type {
  GenerateGeoContentBriefOptions,
  GenerateGeoContentBriefResult,
  GeoContentBrief,
  GeoWriterResult,
  RunGeoWriterOptions,
} from "@notra/ai/types/geo-writer";
import type {
  PostToolsConfig,
  PostToolsResult,
} from "@notra/ai/types/post-tools";
import { updatePostRecord } from "@notra/ai/utils/post-service";
import { summarizeRouteUsage } from "@notra/ai/utils/route-usage";
import { buildExperimentalTelemetry } from "@notra/ai/utils/tcc";
import { db } from "@notra/db/drizzle";
import { posts } from "@notra/db/schema";
import {
  generateText,
  type FinishReason,
  type LanguageModelUsage,
  NoObjectGeneratedError,
  Output,
  stepCountIs,
  ToolLoopAgent,
} from "ai";
import { and, eq } from "drizzle-orm";

const DEFAULT_LANGUAGE = "English";
const MAX_HEADING_DRIFT = 1;
const MIN_HUMANIZED_LENGTH_RATIO = 0.6;
const MARKDOWN_HEADING_REGEX = /^#{1,6}\s+/gm;
const MARKDOWN_LINK_URL_REGEX = /\]\((\S+?)\)/g;
const DASH_REGEX = /[–—]/g;

export class GeoWriterError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GeoWriterError";
  }
}

function toTokenUsage(
  usage: LanguageModelUsage | undefined,
  route?: AgentTokenUsage["route"]
): AgentTokenUsage {
  return {
    inputTokens: usage?.inputTokens ?? 0,
    outputTokens: usage?.outputTokens ?? 0,
    totalTokens: usage?.totalTokens ?? 0,
    cacheReadTokens: usage?.inputTokenDetails?.cacheReadTokens ?? 0,
    cacheWriteTokens: usage?.inputTokenDetails?.cacheWriteTokens ?? 0,
    modelId: GEO_WRITER_MODEL,
    route,
    raw: usage,
  };
}

function mergeTokenUsage(
  base: AgentTokenUsage,
  extra: AgentTokenUsage
): AgentTokenUsage {
  return {
    inputTokens: base.inputTokens + extra.inputTokens,
    outputTokens: base.outputTokens + extra.outputTokens,
    totalTokens: base.totalTokens + extra.totalTokens,
    cacheReadTokens: base.cacheReadTokens + extra.cacheReadTokens,
    cacheWriteTokens: base.cacheWriteTokens + extra.cacheWriteTokens,
    modelId: base.modelId ?? extra.modelId,
    route: base.route ?? extra.route,
    raw: { agent: base.raw, humanizer: extra.raw },
  };
}

interface PlannerFailure {
  errors: string[];
  previousOutput?: string;
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

/**
 * `result.output` throws when the model did not finish with `stop`, so an
 * unfinished response has to be described before the output is read. A
 * `length` finish means the brief hit the token budget; the truncated JSON is
 * handed back to the model so the repair attempt can shorten it.
 */
function describeUnfinishedPlan(
  finishReason: FinishReason,
  text: string,
  usage: LanguageModelUsage
): PlannerFailure {
  const previousOutput = text.trim() || undefined;
  if (finishReason === "length") {
    return {
      errors: [
        `The brief was cut off before it was complete (finish reason: length, ${usage.outputTokens ?? "unknown"} output tokens, limit ${GEO_WRITER_PLANNER_MAX_TOKENS}). Keep every field short and stay within the item limits.`,
      ],
      previousOutput,
    };
  }
  return {
    errors: [
      `The planner stopped before returning a brief (finish reason: ${finishReason}).`,
    ],
    previousOutput,
  };
}

function describePlannerFailure(error: unknown): PlannerFailure {
  if (NoObjectGeneratedError.isInstance(error)) {
    const previousOutput = error.text;

    if (previousOutput) {
      try {
        const parsed = geoContentBriefSchema.safeParse(
          JSON.parse(previousOutput)
        );
        if (!parsed.success) {
          return {
            errors: parsed.error.issues.map(
              (issue) => `${issue.path.join(".") || "brief"}: ${issue.message}`
            ),
            previousOutput,
          };
        }
      } catch {
        // The raw response is still useful to the model during the repair attempt.
      }
    }

    return {
      errors: [
        `${error.message}${error.finishReason ? ` Finish reason: ${error.finishReason}.` : ""}`,
      ],
      previousOutput,
    };
  }

  if (error instanceof Error) {
    return { errors: [error.message] };
  }
  return { errors: ["Unknown planner error"] };
}

export async function generateGeoContentBrief(
  options: GenerateGeoContentBriefOptions
): Promise<GenerateGeoContentBriefResult> {
  const { organizationId, input, log } = options;

  await assertRouteHasCredits({ organizationId, modelId: GEO_WRITER_MODEL });

  const model = createModel(
    organizationId,
    GEO_WRITER_MODEL,
    { disableMemory: true },
    log
  );
  const system = buildGeoPlannerSystem();
  const basePrompt = buildGeoPlannerPrompt(input);

  let prompt = basePrompt;
  let usage: AgentTokenUsage = toTokenUsage(undefined);
  let lastError = "The planner produced no output";

  for (
    let attempt = 0;
    attempt <= GEO_WRITER_PLANNER_REPAIR_ATTEMPTS;
    attempt++
  ) {
    try {
      const result = await generateText({
        model,
        output: Output.object({ schema: geoContentBriefSchema }),
        system,
        prompt,
        temperature: GEO_WRITER_PLANNER_TEMPERATURE,
        maxOutputTokens: GEO_WRITER_PLANNER_MAX_TOKENS,
        providerOptions: withRouterDefaults(undefined, {
          modelId: GEO_WRITER_MODEL,
        }),
      });
      usage = mergeTokenUsage(usage, toTokenUsage(result.usage));
      if (result.finishReason !== "stop") {
        const failure = describeUnfinishedPlan(
          result.finishReason,
          result.text,
          result.usage
        );
        lastError = failure.errors.join("; ");
        prompt = `${basePrompt}\n\n${buildGeoPlannerRepairPrompt({
          errors: failure.errors,
          previousOutput: failure.previousOutput,
        })}`;
        continue;
      }
      const parsed = geoContentBriefSchema.safeParse(result.output);
      if (parsed.success) {
        return { brief: stripDashes(parsed.data), usage };
      }
      lastError = parsed.error.issues
        .map((issue) => `${issue.path.join(".") || "brief"}: ${issue.message}`)
        .join("; ");
    } catch (error) {
      const failure = describePlannerFailure(error);
      lastError = failure.errors.join("; ");
      prompt = `${basePrompt}\n\n${buildGeoPlannerRepairPrompt({
        errors: failure.errors,
        previousOutput: failure.previousOutput,
      })}`;
      continue;
    }

    prompt = `${basePrompt}\n\n${buildGeoPlannerRepairPrompt({
      errors: [lastError],
    })}`;
  }

  throw new GeoWriterError(`Failed to plan the article: ${lastError}`);
}

function stripDashesFromText(value: string): string {
  return value.replace(DASH_REGEX, ", ");
}

function stripDashes(brief: GeoContentBrief): GeoContentBrief {
  return {
    ...brief,
    targetPrompt: stripDashesFromText(brief.targetPrompt),
    intent: stripDashesFromText(brief.intent),
    workingTitle: stripDashesFromText(brief.workingTitle),
    audience: stripDashesFromText(brief.audience),
    jobToBeDone: stripDashesFromText(brief.jobToBeDone),
    sections: brief.sections.map((section) => ({
      heading: stripDashesFromText(section.heading),
      goal: stripDashesFromText(section.goal),
      claims: section.claims.map(stripDashesFromText),
    })),
    questionsToAnswer: brief.questionsToAnswer.map(stripDashesFromText),
    internalLinks: brief.internalLinks.map((link) => ({
      url: link.url,
      anchor: stripDashesFromText(link.anchor),
      why: stripDashesFromText(link.why),
    })),
    acceptanceChecklist: brief.acceptanceChecklist.map(stripDashesFromText),
    recommendedAngle: brief.recommendedAngle
      ? stripDashesFromText(brief.recommendedAngle)
      : undefined,
    competitorsToCounter: brief.competitorsToCounter?.map(stripDashesFromText),
    sourcesToReference: brief.sourcesToReference?.map(stripDashesFromText),
    missingCoverage: brief.missingCoverage?.map(stripDashesFromText),
  };
}

function countHeadings(markdown: string): number {
  return markdown.match(MARKDOWN_HEADING_REGEX)?.length ?? 0;
}

function collectLinkUrls(markdown: string): Set<string> {
  const urls = new Set<string>();
  for (const match of markdown.matchAll(MARKDOWN_LINK_URL_REGEX)) {
    const url = match[1];
    if (url) {
      urls.add(url);
    }
  }
  return urls;
}

function unwrapCodeFence(markdown: string): string {
  const trimmed = markdown.trim();
  if (!trimmed.startsWith("```")) {
    return trimmed;
  }
  const firstBreak = trimmed.indexOf("\n");
  const lastFence = trimmed.lastIndexOf("```");
  if (firstBreak === -1 || lastFence <= firstBreak) {
    return trimmed;
  }
  return trimmed.slice(firstBreak + 1, lastFence).trim();
}

export function isHumanizedDraftAcceptable(
  original: string,
  humanized: string
): boolean {
  if (humanized.length < original.length * MIN_HUMANIZED_LENGTH_RATIO) {
    return false;
  }

  const headingDrift = Math.abs(
    countHeadings(original) - countHeadings(humanized)
  );
  if (headingDrift > MAX_HEADING_DRIFT) {
    return false;
  }

  const humanizedUrls = collectLinkUrls(humanized);
  for (const url of collectLinkUrls(original)) {
    if (!humanizedUrls.has(url)) {
      return false;
    }
  }

  return true;
}

async function humanizeMarkdown(
  options: RunGeoWriterOptions,
  markdown: string
): Promise<{ markdown: string | null; usage: AgentTokenUsage }> {
  const model = createModel(
    options.organizationId,
    GEO_WRITER_MODEL,
    {
      disableMemory: true,
    },
    options.log
  );

  const result = await generateText({
    model,
    system: GEO_HUMANIZER_SYSTEM,
    prompt: buildGeoHumanizerPrompt(markdown),
    maxOutputTokens: GEO_WRITER_HUMANIZER_MAX_TOKENS,
    providerOptions: withRouterDefaults(undefined, {
      modelId: GEO_WRITER_MODEL,
    }),
    experimental_telemetry: buildExperimentalTelemetry({
      ...options.telemetryMetadata,
      stage: "geo_writer_humanize",
    }),
  });

  const humanized = stripDashesFromText(unwrapCodeFence(result.text));
  const usage = toTokenUsage(result.usage);

  if (!isHumanizedDraftAcceptable(markdown, humanized)) {
    return { markdown: null, usage };
  }

  return { markdown: humanized, usage };
}

function formatMonthYear(date: Date): string {
  try {
    return new Intl.DateTimeFormat("en", {
      month: "long",
      year: "numeric",
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 7);
  }
}

export async function runGeoWriter(
  options: RunGeoWriterOptions
): Promise<GeoWriterResult> {
  const {
    organizationId,
    projectId,
    brandSettingsId,
    collectionId,
    brief,
    topic,
    brandName,
    sourceMetadata,
    log,
    telemetryMetadata,
    postId,
  } = options;
  const language = options.language?.trim() || DEFAULT_LANGUAGE;
  const now = new Date();

  await assertRouteHasCredits({ organizationId, modelId: GEO_WRITER_MODEL });

  const model = createModel(
    organizationId,
    GEO_WRITER_MODEL,
    {
      disableMemory: true,
    },
    log
  );

  const instructions = buildGeoWriterInstructions({
    brief,
    brandName,
    topic,
    today: now.toISOString().slice(0, 10),
    monthYear: formatMonthYear(now),
    language,
  });

  const postToolsResult: PostToolsResult = {};
  const postToolsConfig: PostToolsConfig = {
    organizationId,
    collectionId,
    contentType: "blog_post",
    contentSubtype: brief.contentSubtype,
    sourceMetadata,
    autoPublish: false,
    targetPostId: postId ?? undefined,
  };

  const agent = new ToolLoopAgent({
    model,
    providerOptions: withRouterDefaults(
      { anthropic: { thinking: { type: "adaptive" } } },
      { modelId: GEO_WRITER_MODEL }
    ),
    tools: {
      getBrandReferences: createGetBrandReferencesTool({
        organizationId,
        voiceId: brandSettingsId,
        agentType: "blog",
      }),
      searchBrandReferences: createSearchBrandReferencesTool({
        organizationId,
        voiceId: brandSettingsId,
        agentType: "blog",
      }),
      getSitemapPages: createGetSitemapPagesTool({ brandSettingsId }),
      fetchSitemapPage: createFetchSitemapPageTool({ brandSettingsId }),
      getGeoContext: createGetGeoContextTool({ organizationId, projectId }),
      listAvailableSkills: listAvailableSkills({ organizationId }),
      getSkillByName: getSkillByName({ organizationId }),
      createBlogPost: createCreatePostTool(postToolsConfig, postToolsResult),
      viewPost: createViewPostTool(postToolsConfig),
      fail: createFailTool(postToolsResult),
    },
    instructions,
    stopWhen: stepCountIs(GEO_WRITER_MAX_STEPS),
    experimental_telemetry: buildExperimentalTelemetry({
      ...telemetryMetadata,
      stage: "geo_writer_draft",
    }),
  });

  const result = await agent.generate({
    prompt: `Write the article "${brief.workingTitle}" now. Follow the brief and the steps in your instructions, then save it with createBlogPost.`,
  });

  if (postToolsResult.failReason) {
    throw new GeoWriterError(postToolsResult.failReason);
  }

  const primaryPost = postToolsResult.posts?.at(0);
  if (!primaryPost) {
    throw new GeoWriterError(
      "The writer finished without saving a post. No createBlogPost call was made."
    );
  }

  const routeUsage = await summarizeRouteUsage(result.steps);
  let usage = toTokenUsage(result.totalUsage, routeUsage.route);

  const draft = await db.query.posts.findFirst({
    columns: { markdown: true },
    where: and(
      eq(posts.id, primaryPost.postId),
      eq(posts.organizationId, organizationId)
    ),
  });

  let humanized = false;
  if (draft?.markdown) {
    try {
      const pass = await humanizeMarkdown(options, draft.markdown);
      usage = mergeTokenUsage(usage, pass.usage);
      if (pass.markdown) {
        const update = await updatePostRecord({
          organizationId,
          postId: primaryPost.postId,
          markdown: pass.markdown,
        });
        humanized = update.status === "updated";
      } else {
        console.warn(
          "[GEO writer] humanizer output failed invariants, keeping raw draft",
          { postId: primaryPost.postId }
        );
      }
    } catch (error) {
      console.warn("[GEO writer] humanizer pass failed, keeping raw draft", {
        postId: primaryPost.postId,
        error: describeError(error),
      });
    }
  }

  return {
    postId: primaryPost.postId,
    title: primaryPost.title,
    humanized,
    usage,
  };
}
