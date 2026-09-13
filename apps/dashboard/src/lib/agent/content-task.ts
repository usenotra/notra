import { getUserPrompt } from "@notra/ai/prompts/user";
import { contentWriterResultSchema } from "@notra/ai/schemas/content-writer-result";
import { ensureSystemSkillToneSections } from "@notra/ai/skills/seed";
import { db } from "@notra/db/drizzle";
import { posts } from "@notra/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { runAgentTask } from "@/lib/agent/client";
import type { ContentGenerationResult } from "@/lib/workflows/schedule/types";
import type { AgentContentTaskOptions } from "@/types/agent-content-task";

function buildTaskMessage(options: AgentContentTaskOptions): string {
  const repositories = options.repositories
    .map(
      (repository) =>
        `- repository ${repository.owner}/${repository.repo}; integrationId: ${repository.integrationId}`
    )
    .join("\n");
  const linearIntegrations = (options.linearIntegrations ?? [])
    .map(
      (integration) => `- Linear integrationId: ${integration.integrationId}`
    )
    .join("\n");

  return [
    "Delegate this task to the content-writer subagent in a single call, then report its structured result via final_output without changing it.",
    "",
    `Task for content-writer: produce one ${options.contentLabel} (contentType: ${options.contentType}).`,
    "",
    "Connected sources:",
    repositories,
    linearIntegrations,
    "",
    getUserPrompt(options.contentLabel, options.promptInput),
  ]
    .filter((line) => line !== null)
    .join("\n");
}

export async function generateContentViaAgentTask(
  options: AgentContentTaskOptions
): Promise<ContentGenerationResult> {
  try {
    // Best-effort migration: a transient DB failure here must not fail the
    // whole generation — the previous skill content still generates fine.
    try {
      await ensureSystemSkillToneSections(options.organizationId);
    } catch (error) {
      console.warn(
        "[content-task] ensureSystemSkillToneSections failed, continuing with existing skills",
        error
      );
    }
    const { output } = await runAgentTask({
      scope: {
        organizationId: options.organizationId,
        surface: "task",
        collectionId: options.collectionId,
        contentType: options.contentType,
        autoPublish: options.autoPublish,
        voiceId: options.voiceId,
        chargeAiCredits: options.chargeAiCredits,
        brandAgentType: options.brandAgentType,
        sourceMetadata: options.sourceMetadata,
        generationConfig: {
          selectionFilters: options.selectionFilters,
          commitWindow: options.commitWindow,
          dataPointSettings: options.dataPointSettings,
        },
      },
      message: buildTaskMessage(options),
      mode: "task",
      outputSchema: z.toJSONSchema(contentWriterResultSchema),
    });

    const parsed = contentWriterResultSchema.safeParse(output);
    if (!parsed.success) {
      return {
        status: "generation_failed",
        reason: "Agent task returned an invalid result payload",
      };
    }

    if (parsed.data.status === "skipped") {
      return {
        status: "skipped",
        reason: parsed.data.reason ?? "No meaningful source material",
      };
    }
    if (parsed.data.status === "failed") {
      return {
        status: "generation_failed",
        reason: parsed.data.reason ?? "Agent task failed",
      };
    }

    const reportedIds = parsed.data.posts.map((post) => post.postId);
    const verified = reportedIds.length
      ? await db.query.posts.findMany({
          columns: { id: true, title: true },
          where: and(
            eq(posts.organizationId, options.organizationId),
            eq(posts.collectionId, options.collectionId),
            inArray(posts.id, reportedIds)
          ),
        })
      : [];
    if (verified.length === 0) {
      return {
        status: "generation_failed",
        reason:
          "Agent task reported created posts that do not exist in the database",
      };
    }

    const verifiedIds = new Set(verified.map((post) => post.id));
    const confirmedPosts = parsed.data.posts.filter((post) =>
      verifiedIds.has(post.postId)
    );
    const first = confirmedPosts[0];
    if (!first) {
      return {
        status: "generation_failed",
        reason:
          "Agent task reported created posts that do not exist in the database",
      };
    }

    return {
      status: "ok",
      postId: first.postId,
      title: first.title,
      posts: confirmedPosts.map((post) => ({
        postId: post.postId,
        title: post.title,
        recommendations: post.recommendations,
      })),
    };
  } catch (error) {
    return {
      status: "generation_failed",
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}
