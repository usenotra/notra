import {
  type CreateScheduleInput,
  createScheduleToolInputSchema,
} from "@notra/ai/schemas/schedules";
import {
  createContentSchedule,
  listContentSchedules,
} from "@notra/ai/utils/content-schedules";
import { toolDescription } from "@notra/ai/utils/description";
import { type Tool, tool } from "ai";
import { z } from "zod";

export interface ScheduleToolContext {
  organizationId: string;
}

export function createListSchedulesTool(ctx: ScheduleToolContext): Tool {
  return tool({
    description: toolDescription({
      toolName: "listSchedules",
      intro:
        "Lists this workspace's content schedules: name, cadence, output type, repositories, lookback window, and whether each one is enabled.",
      whenToUse:
        "Before creating a schedule, or when the user asks what automations already run.",
      whenNotToUse:
        "The user wants a one-off draft. Create the post instead of listing schedules.",
    }),
    inputSchema: z.object({}),
    execute: async () => {
      const schedules = await listContentSchedules(ctx.organizationId);
      return { schedules, count: schedules.length };
    },
  });
}

export function createCreateScheduleTool(ctx: ScheduleToolContext): Tool {
  return tool({
    description: toolDescription({
      toolName: "createSchedule",
      intro:
        "Creates a recurring content automation that drafts changelog, blog, social, or image content from connected GitHub repositories on a cadence.",
      whenToUse:
        "The user asks to schedule, automate, or regularly generate content.",
      whenNotToUse:
        "They want a single draft now, or an existing schedule already matches the same repositories, output, cadence, lookback, instructions, and brand voice.",
      usageNotes:
        "Call listSchedules first. Times are UTC. repositoryIds are GitHub integration IDs. Ask which repository to use when more than one is connected and the user did not name one. autoPublish applies only to changelog and blog_post; leave it false unless they explicitly want those drafts published. LinkedIn, Twitter, and image schedules stay drafts. A matching schedule, including the same brand voice, is returned as duplicate instead of creating a second one.",
    }),
    inputSchema: createScheduleToolInputSchema,
    execute: async (input: CreateScheduleInput) =>
      createContentSchedule(ctx.organizationId, input),
  });
}
