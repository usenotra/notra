import { ContentGenerationSkippedError } from "@notra/ai/agents/background-gen";
import { generateBlogPost } from "@notra/ai/agents/blog-post";
import { generateChangelog } from "@notra/ai/agents/changelog";
import { generateLinkedInPost } from "@notra/ai/agents/linkedin";
import { generateTwitterPost } from "@notra/ai/agents/twitter";

import { AGENT_CONTENT_TASK_TYPES } from "@/constants/agent-content";
import { generateContentViaAgentTask } from "@/lib/agent/content-task";
import { isAgentContentGenerationEnabled } from "@/lib/agent/flag";
import type {
  EventGenerationContext,
  EventGenerationResult,
} from "@/types/workflows/workflows";

import { buildEventPromptInput } from "../prompt-input";

export async function generateEventBasedContent(
  ctx: EventGenerationContext
): Promise<EventGenerationResult> {
  const { outputType } = ctx;

  const generateFnMap: Record<string, typeof generateChangelog> = {
    changelog: generateChangelog,
    blog_post: generateBlogPost,
    twitter_post: generateTwitterPost,
    linkedin_post: generateLinkedInPost,
  };

  const generateFn = generateFnMap[outputType];
  if (!generateFn) {
    return {
      status: "unsupported_output_type",
      outputType,
    };
  }

  const agentTaskType = isAgentContentGenerationEnabled()
    ? AGENT_CONTENT_TASK_TYPES[outputType]
    : undefined;
  // buildEventPromptInput always sets tone from ctx.tone.
  const promptInput = buildEventPromptInput(ctx);
  if (agentTaskType) {
    const agentResult = await generateContentViaAgentTask({
      organizationId: ctx.organizationId,
      collectionId: ctx.collectionId,
      contentType: agentTaskType.contentType,
      contentLabel: agentTaskType.contentLabel,
      brandAgentType: agentTaskType.brandAgentType,
      repositories: [
        {
          integrationId: ctx.repositoryId,
          owner: ctx.repositoryOwner,
          repo: ctx.repositoryName,
          defaultBranch: null,
        },
      ],
      promptInput,
      sourceMetadata: ctx.sourceMetadata,
      autoPublish: ctx.autoPublish,
      chargeAiCredits: ctx.chargeAiCredits,
    });
    if (agentResult.status === "rate_limited") {
      return {
        status: "generation_failed",
        reason: "Agent task was rate limited",
      };
    }
    return agentResult;
  }

  try {
    const repositories = [
      {
        integrationId: ctx.repositoryId,
        owner: ctx.repositoryOwner,
        repo: ctx.repositoryName,
        defaultBranch: null,
      },
    ];

    const agentOptions = {
      organizationId: ctx.organizationId,
      collectionId: ctx.collectionId,
      repositories,
      tone: ctx.tone,
      promptInput,
      sourceMetadata: ctx.sourceMetadata,
      autoPublish: ctx.autoPublish,
      resolveContext: ctx.resolveContext,
      telemetryMetadata: ctx.telemetryMetadata,
    };

    const result = await generateFn(agentOptions);

    return {
      status: "ok",
      postId: result.postId,
      title: result.title,
      posts: result.posts,
      usage: result.usage,
    };
  } catch (error) {
    if (error instanceof ContentGenerationSkippedError) {
      return {
        status: "skipped",
        reason: error.message,
      };
    }

    return {
      status: "generation_failed",
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}
