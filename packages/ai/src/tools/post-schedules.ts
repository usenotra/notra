import { SCHEDULE_POST_FAILURES } from "@notra/ai/constants/scheduled-publications";
import {
  postScheduleToolInputSchema,
  schedulePostToolInputSchema,
} from "@notra/ai/schemas/post-schedules";
import type {
  PostScheduleToolInput,
  ScheduleDestination,
  SchedulePostToolInput,
} from "@notra/ai/types/scheduled-publications";
import { toolDescription } from "@notra/ai/utils/description";
import {
  cancelPostSchedule,
  getPostSchedule,
  schedulePostPublication,
} from "@notra/ai/utils/scheduled-publications";
import { type Tool, tool } from "ai";

export interface PostScheduleToolContext {
  organizationId: string;
  userId?: string;
}

export function createGetPostScheduleTool(ctx: PostScheduleToolContext): Tool {
  return tool({
    description: toolDescription({
      toolName: "getPostSchedule",
      intro:
        "Returns when a post is scheduled to publish and the state of each destination (Notra, GitHub, social), or null when it is not scheduled.",
      whenToUse:
        "Before scheduling or unscheduling a post, or when the user asks when something goes out.",
    }),
    inputSchema: postScheduleToolInputSchema,
    execute: async (input: PostScheduleToolInput) => ({
      schedule: await getPostSchedule({
        organizationId: ctx.organizationId,
        postId: input.postId,
      }),
    }),
  });
}

export function createSchedulePostTool(ctx: PostScheduleToolContext): Tool {
  return tool({
    description: toolDescription({
      toolName: "schedulePost",
      intro:
        "Schedules an existing post to publish automatically at a set time: it is marked as published in Notra and can also be opened and merged on GitHub or posted to a connected X or LinkedIn account.",
      whenToUse:
        "The user asks to publish, release, or post something at a specific day or time.",
      whenNotToUse:
        "They want content generated on a recurring cadence (use createSchedule) or published right now.",
      usageNotes:
        "Replaces a schedule that has not started. GitHub only works for blog posts and changelogs; social accounts only for tweets and LinkedIn posts on the matching platform. Use getAvailableIntegrations for GitHub integration IDs and ask which repository or account to use when there is more than one. The post goes out as saved at that time.",
    }),
    inputSchema: schedulePostToolInputSchema,
    execute: async (input: SchedulePostToolInput) => {
      const destinations: ScheduleDestination[] = [];
      if (input.githubRepositoryId) {
        destinations.push({
          destination: "github",
          repositoryId: input.githubRepositoryId,
          merge: input.mergePullRequest ?? true,
        });
      }
      if (input.socialAccountId) {
        destinations.push({
          destination: "social",
          accountId: input.socialAccountId,
        });
      }
      const outcome = await schedulePostPublication({
        organizationId: ctx.organizationId,
        postId: input.postId,
        scheduledAt: new Date(input.scheduledAt),
        timeZone: input.timeZone,
        destinations,
        userId: ctx.userId ?? null,
      });
      return outcome.ok
        ? { success: true, schedule: outcome.schedule }
        : {
            success: false,
            reason: outcome.reason,
            error: SCHEDULE_POST_FAILURES[outcome.reason].message,
          };
    },
  });
}

export function createCancelPostScheduleTool(
  ctx: PostScheduleToolContext
): Tool {
  return tool({
    description: toolDescription({
      toolName: "cancelPostSchedule",
      intro:
        "Cancels a post's pending schedule. Destinations already publishing finish on their own.",
      whenToUse:
        "The user asks to unschedule a post or stop it from going out.",
    }),
    inputSchema: postScheduleToolInputSchema,
    execute: async (input: PostScheduleToolInput) =>
      cancelPostSchedule({
        organizationId: ctx.organizationId,
        postId: input.postId,
      }),
  });
}
