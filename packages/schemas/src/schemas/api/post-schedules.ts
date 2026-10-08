import "zod/compile";
import { z } from "@hono/zod-openapi";
import {
  postScheduleViewSchema,
  scheduledPublicationViewSchema,
} from "@notra/ai/schemas/post-schedules";
import { isValidTimezone } from "@notra/ai/utils/current-date";

import { CONTENT_CALENDAR_TIME_ZONE_MAX_LENGTH } from "../../constants/dashboard/content-calendar";
import { organizationResponseSchema } from "./content";
import { resourceIdSchema } from "./ids";

const scheduleDestinationRequestSchema = z
  .discriminatedUnion("destination", [
    z.object({
      destination: z.literal("github"),
      repositoryId: resourceIdSchema("repositoryId").openapi({
        description:
          "GitHub integration ID from GET /v1/integrations. Only for blog posts and changelogs.",
        example: "int_123",
      }),
      merge: z.boolean().default(true).openapi({
        description:
          "Merge the pull request at the scheduled time. When false, the pull request is only opened or updated.",
      }),
    }),
    z.object({
      destination: z.literal("social"),
      accountId: resourceIdSchema("accountId").openapi({
        description:
          "Connected X or LinkedIn account ID. Only for tweets and LinkedIn posts, on an account of the matching platform.",
        example: "acc_123",
      }),
    }),
  ])
  .openapi("ScheduleDestination");

export const schedulePostRequestSchema = z
  .object({
    scheduledAt: z.iso.datetime({ offset: true }).openapi({
      description:
        "When to publish, as an ISO 8601 timestamp. At most one year ahead; a time up to five minutes in the past publishes right away.",
      example: "2026-10-06T08:00:00Z",
    }),
    timeZone: z
      .string()
      .trim()
      .min(1)
      .max(CONTENT_CALENDAR_TIME_ZONE_MAX_LENGTH)
      .refine(isValidTimezone, "Unknown time zone")
      .default("UTC")
      .openapi({
        description:
          "IANA time zone the schedule was picked in. Used for display and emails only.",
        example: "Europe/Berlin",
      }),
    destinations: z
      .array(scheduleDestinationRequestSchema)
      .max(2)
      .refine(
        (destinations) =>
          new Set(destinations.map((item) => item.destination)).size ===
          destinations.length,
        "Each destination can only be added once"
      )
      .default([])
      .openapi({
        description:
          "Where the post goes out besides Notra. The post is always marked as published in Notra at the scheduled time.",
      }),
  })
  .openapi("SchedulePostRequest");

export const postScheduleResponseSchema = z
  .object({
    organization: organizationResponseSchema,
    schedule: postScheduleViewSchema
      .extend({
        publications: z.array(
          scheduledPublicationViewSchema.openapi("ScheduledPublication")
        ),
      })
      .openapi("PostSchedule")
      .nullable(),
  })
  .openapi("PostScheduleResponse");

export const cancelPostScheduleResponseSchema = z
  .object({
    organization: organizationResponseSchema,
    canceled: z.number().int().openapi({
      description: "Destinations that were canceled or cleared.",
    }),
    inProgress: z.boolean().openapi({
      description:
        "True when a destination was already publishing; it cannot be stopped and finishes on its own.",
    }),
  })
  .openapi("CancelPostScheduleResponse");
