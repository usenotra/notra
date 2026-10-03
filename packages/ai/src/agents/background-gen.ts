import { CONTENT_AGENT_MODEL } from "@notra/ai/constants/models";
import { assertRouteHasCredits } from "@notra/ai/gateway";
import { createModel } from "@notra/ai/model";
import { buildContentDispatcherInstructions } from "@notra/ai/prompts/content-dispatcher";
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
import { buildTelemetryOptions } from "@notra/ai/utils/tcc";
import { toAgentTokenUsage } from "@notra/ai/utils/token-usage";
import { isStepCount, ToolLoopAgent } from "ai";

export class ContentGenerationSkippedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContentGenerationSkippedError";
  }
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

  const instructions = buildContentDispatcherInstructions({
    contentLabel,
    contentType,
    primarySkillName: skillName,
  });

  await assertRouteHasCredits({ organizationId, modelId: CONTENT_AGENT_MODEL });

  const model = createModel(organizationId, CONTENT_AGENT_MODEL, {}, log);

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
        gateway: { tags: ["content-generation"] },
      },
      { modelId: CONTENT_AGENT_MODEL }
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
    stopWhen: isStepCount(50),
    ...buildTelemetryOptions(telemetryMetadata),
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
      ...toAgentTokenUsage(result.usage),
      maxPromptTokens: routeUsage.maxPromptTokens,
      tokenCostUsd: routeUsage.tokenCostUsd,
      route: routeUsage.route,
      raw: result.usage,
    },
  };
}
