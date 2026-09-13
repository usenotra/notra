import { AGENT_DEFAULT_MODEL } from "@notra/ai/constants/models";
import { assertRouteHasCredits } from "@notra/ai/gateway";
import { createModel } from "@notra/ai/model";
import { getUserPrompt } from "@notra/ai/prompts/user";
import { withRouterDefaults } from "@notra/ai/provider-options";
import {
  createGetBrandReferencesTool,
  createSearchBrandReferencesTool,
} from "@notra/ai/tools/brand-references";
import { buildGitHubDataTools } from "@notra/ai/tools/github";
import { buildLinearDataTools } from "@notra/ai/tools/linear";
import {
  createCreatePostTool,
  createFailTool,
  createSkipTool,
  createUpdatePostTool,
  createViewPostTool,
} from "@notra/ai/tools/post";
import { getSkillByName, listAvailableSkills } from "@notra/ai/tools/skills";
import type {
  BackgroundGenOptions,
  BackgroundGenResult,
} from "@notra/ai/types/agents";
import type {
  PostToolsConfig,
  PostToolsResult,
} from "@notra/ai/types/post-tools";
import { summarizeRouteUsage } from "@notra/ai/utils/route-usage";
import { buildExperimentalTelemetry } from "@notra/ai/utils/tcc";
import { stepCountIs, ToolLoopAgent } from "ai";

export class ContentGenerationSkippedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContentGenerationSkippedError";
  }
}

function buildDispatcherInstructions(options: {
  contentLabel: string;
  contentType: string;
  primarySkillName: string;
}): string {
  return `You are a content generation agent for this organization. Your task: produce ${options.contentLabel} (contentType: ${options.contentType}).

Skills drive your behavior. Skill content is NOT injected into this prompt. You load skills on demand via tools.

Do these steps in order:

1. Call listAvailableSkills to see every writing skill this organization has. Study the names and descriptions.

2. Identify the primary skill that matches your task. The hint from the trigger is "${options.primarySkillName}". Confirm it exists and is the right fit. If a differently-named skill looks like a better match based on its description, use that instead.

3. Call getSkillByName to load the primary skill's full instructions. Read them carefully and follow them exactly. They override these dispatcher instructions on any overlap.

4. Execute the primary skill: gather source data via the provided tools (brand references, GitHub, Linear), then draft the post according to the skill's format and rules.

5. Before finalizing, scan the skill list again for supporting skills (for example, a "humanizer" skill for polishing AI-sounding output, or any org-specific skill whose description applies). Load any that apply via getSkillByName and apply their guidance to your near-final draft.

6. When the content is finalized, call createPost. If source lookup succeeds but there is no meaningful source material, call skip with a concise reason. Use skip for expected no-op cases such as no commits, no PRs, no releases, no Linear issues, or only low-signal/internal changes in the requested lookback window. Never skip because a selected repository, Linear team, integration, owner, or source label differs from the brand identity. Apply the requested brand voice to whatever connected source the workflow selected. Use fail only for actual errors, impossible requests, invalid inputs, or tool/API failures. Do not return the content as plain text.

## Output rules (hard)
- NEVER use em dashes (—) or en dashes (–) anywhere in the post content, title, recommendations, or any text you emit. Use commas, periods, semicolons, parentheses, or a hyphen (-). If a loaded skill's examples contain em/en dashes, ignore that part of the style and substitute safe punctuation.

Skills are the source of truth for how to write. This prompt tells you how to orchestrate them.`;
}

export async function runBackgroundGen(
  options: BackgroundGenOptions
): Promise<BackgroundGenResult> {
  const {
    organizationId,
    collectionId,
    skillName,
    contentType,
    brandAgentType,
    contentLabel,
    voiceId,
    repositories,
    linearIntegrations,
    promptInput,
    sourceMetadata,
    dataPointSettings,
    selectionFilters,
    commitWindow,
    autoPublish,
    resolveContext,
    resolveLinearContext,
    log,
    telemetryMetadata,
    includeSearchBrandReferencesTool,
  } = options;

  if (
    (!repositories || repositories.length === 0) &&
    (!linearIntegrations || linearIntegrations.length === 0)
  ) {
    throw new Error(
      `At least one repository or Linear integration must be provided to generate ${contentLabel}.`
    );
  }

  const instructions = buildDispatcherInstructions({
    contentLabel,
    contentType,
    primarySkillName: skillName,
  });

  await assertRouteHasCredits({ organizationId, modelId: AGENT_DEFAULT_MODEL });

  const model = createModel(organizationId, AGENT_DEFAULT_MODEL, {}, log);

  const prompt = getUserPrompt(contentLabel, promptInput);

  const allowedIntegrationIds = Array.from(
    new Set((repositories ?? []).map((repo) => repo.integrationId))
  );

  const allowedLinearIntegrationIds = Array.from(
    new Set((linearIntegrations ?? []).map((li) => li.integrationId))
  );

  const postToolsResult: PostToolsResult = {};
  const postToolsConfig: PostToolsConfig = {
    organizationId,
    collectionId,
    contentType,
    sourceMetadata,
    autoPublish,
  };

  const brandReferenceTools: Record<
    string,
    ReturnType<typeof createGetBrandReferencesTool>
  > = {
    getBrandReferences: createGetBrandReferencesTool({
      organizationId,
      voiceId,
      agentType: brandAgentType,
    }),
  };

  if (includeSearchBrandReferencesTool) {
    brandReferenceTools.searchBrandReferences = createSearchBrandReferencesTool(
      {
        organizationId,
        voiceId,
        agentType: brandAgentType,
      }
    );
  }

  const agent = new ToolLoopAgent({
    model,
    providerOptions: withRouterDefaults(
      {
        anthropic: {
          thinking: { type: "adaptive" },
        },
      },
      { modelId: AGENT_DEFAULT_MODEL }
    ),
    tools: {
      ...brandReferenceTools,
      ...buildGitHubDataTools({
        organizationId,
        allowedIntegrationIds,
        dataPointSettings,
        selectionFilters,
        commitWindow,
        resolveContext,
      }),
      ...buildLinearDataTools({
        organizationId,
        allowedIntegrationIds: allowedLinearIntegrationIds,
        dataPointSettings,
        resolveContext: resolveLinearContext,
      }),
      listAvailableSkills: listAvailableSkills({ organizationId }),
      getSkillByName: getSkillByName({ organizationId }),
      createPost: createCreatePostTool(postToolsConfig, postToolsResult),
      updatePost: createUpdatePostTool(postToolsConfig, postToolsResult),
      viewPost: createViewPostTool(postToolsConfig),
      skip: createSkipTool(postToolsResult),
      fail: createFailTool(postToolsResult),
    },
    instructions,
    stopWhen: stepCountIs(50),
    experimental_telemetry: buildExperimentalTelemetry(telemetryMetadata),
  });

  const result = await agent.generate({ prompt });

  if (postToolsResult.skipReason) {
    throw new ContentGenerationSkippedError(postToolsResult.skipReason);
  }

  if (postToolsResult.failReason) {
    throw new Error(postToolsResult.failReason);
  }

  if (!postToolsResult.posts?.length) {
    throw new Error(
      `${contentLabel} agent completed without creating a post. No createPost tool call was made.`
    );
  }

  const primaryPost = postToolsResult.posts[0];
  if (!primaryPost) {
    throw new Error(`${contentLabel} agent did not return a primary post.`);
  }

  const routeUsage = await summarizeRouteUsage(result.steps);

  return {
    postId: primaryPost.postId,
    title: primaryPost.title,
    posts: postToolsResult.posts,
    usage: {
      inputTokens: result.totalUsage.inputTokens ?? 0,
      outputTokens: result.totalUsage.outputTokens ?? 0,
      totalTokens: result.totalUsage.totalTokens ?? 0,
      cacheReadTokens:
        result.totalUsage.inputTokenDetails?.cacheReadTokens ?? 0,
      cacheWriteTokens:
        result.totalUsage.inputTokenDetails?.cacheWriteTokens ?? 0,
      route: routeUsage.route,
      raw: result.totalUsage,
    },
  };
}
