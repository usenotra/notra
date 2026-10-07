import { SCHEDULE_POST_FAILURES } from "@notra/ai/constants/scheduled-publications";
import type { SchedulePostFailureReason } from "@notra/ai/types/scheduled-publications";
import { listContentCalendar } from "@notra/ai/utils/content-calendar";
import {
  cancelPostSchedule,
  getPostSchedule,
  publishPostScheduleNow,
  retryScheduledPublication,
  schedulePostPublication,
} from "@notra/ai/utils/scheduled-publications";
import { isProjectInOrganization } from "@notra/db/utils/projects";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import { contentInputSchema } from "@notra/schemas/dashboard/content";
import {
  contentCalendarRangeInputSchema,
  schedulePostInputSchema,
  scheduledPublicationIdInputSchema,
} from "@notra/schemas/dashboard/content-calendar";

import { trackServerEvent } from "@/lib/analytics/posthog-server";
import { assertOrganizationAccess } from "@/lib/auth/organization";
import { assertActiveSubscription } from "@/lib/billing/subscription";
import { openScheduledPullRequestAhead } from "@/lib/content/scheduled-publication-destinations";
import { runScheduledPublicationSweep } from "@/lib/content/scheduled-publication-sweep";
import { afterResponse } from "@/lib/framework/after-response";
import { getTranslations } from "@/lib/i18n/server";

import { baseProcedure } from "../base";
import { badRequest, conflict, notFound } from "../utils/errors";

/** A slot this close publishes right away instead of waiting for the cron. */
const IMMEDIATE_PUBLISH_WINDOW_MS = 60 * 1000;

const SCHEDULE_FAILURE_MESSAGE_KEYS = {
  post_not_found: "postNotFound",
  invalid_time: "invalidTime",
  destination_not_supported: "destinationNotSupported",
  repository_not_found: "repositoryNotFound",
  account_not_found: "accountNotFound",
  publishing_in_progress: "publishingInProgress",
  unconfirmed_social_post: "unconfirmedSocialPost",
  social_already_posted: "socialAlreadyPosted",
  conflict: "conflict",
} as const satisfies Record<SchedulePostFailureReason, string>;
const ERROR_BY_STATUS = {
  400: badRequest,
  404: notFound,
  409: conflict,
} as const;

async function toScheduleError(reason: SchedulePostFailureReason) {
  const t = await getTranslations("errors.contentCalendar");
  return ERROR_BY_STATUS[SCHEDULE_POST_FAILURES[reason].status](
    t(SCHEDULE_FAILURE_MESSAGE_KEYS[reason])
  );
}

/** Runs the sweep for one post right after the response, best effort. */
function publishDueNow(postId: string) {
  afterResponse(async () => {
    try {
      await runScheduledPublicationSweep({ postId });
    } catch (error) {
      // The QStash wake queued with the change picks the rows up.
      console.error("[ScheduledPublication] Immediate sweep failed", {
        postId,
        error,
      });
    }
  });
}

export const contentCalendarRouter = {
  list: baseProcedure
    .input(contentCalendarRangeInputSchema)
    .handler(async ({ context, input }) => {
      await assertOrganizationAccess({
        headers: context.headers,
        organizationId: input.organizationId,
      });
      if (
        input.projectId &&
        !(await isProjectInOrganization(input.organizationId, input.projectId))
      ) {
        throw notFound("Project not found");
      }
      return listContentCalendar({
        organizationId: input.organizationId,
        projectId: input.projectId,
        from: new Date(input.from),
        to: new Date(input.to),
      });
    }),
  get: baseProcedure
    .input(contentInputSchema)
    .handler(async ({ context, input }) => {
      await assertOrganizationAccess({
        headers: context.headers,
        organizationId: input.organizationId,
      });
      return {
        schedule: await getPostSchedule({
          organizationId: input.organizationId,
          postId: input.contentId,
        }),
      };
    }),
  schedule: baseProcedure
    .input(schedulePostInputSchema)
    .handler(async ({ context, input }) => {
      const auth = await assertOrganizationAccess({
        headers: context.headers,
        organizationId: input.organizationId,
      });
      await assertActiveSubscription(input.organizationId, "content.schedule");

      const scheduledAt = new Date(input.scheduledAt);
      const outcome = await schedulePostPublication({
        organizationId: input.organizationId,
        postId: input.contentId,
        scheduledAt,
        timeZone: input.timeZone,
        destinations: input.destinations,
        expectedScheduledIds: input.expectedScheduledIds,
        userId: auth.user.id,
      });
      if (!outcome.ok) {
        throw await toScheduleError(outcome.reason);
      }

      if (scheduledAt.getTime() - Date.now() <= IMMEDIATE_PUBLISH_WINDOW_MS) {
        publishDueNow(input.contentId);
      } else {
        const github = input.destinations.find(
          (destination) => destination.destination === "github"
        );
        if (github?.destination === "github") {
          afterResponse(() =>
            openScheduledPullRequestAhead({
              organizationId: input.organizationId,
              postId: input.contentId,
              repositoryId: github.repositoryId,
            })
          );
        }
      }

      trackServerEvent({
        event: POSTHOG_EVENTS.CONTENT_SCHEDULED,
        headers: context.headers,
        userId: auth.user.id,
        organizationId: input.organizationId,
        properties: {
          content_id: input.contentId,
          destinations: input.destinations.map((item) => item.destination),
          lead_hours: Math.round(
            (scheduledAt.getTime() - Date.now()) / (60 * 60 * 1000)
          ),
        },
      });

      return { schedule: outcome.schedule };
    }),
  cancel: baseProcedure
    .input(contentInputSchema)
    .handler(async ({ context, input }) => {
      const auth = await assertOrganizationAccess({
        headers: context.headers,
        organizationId: input.organizationId,
      });
      const result = await cancelPostSchedule({
        organizationId: input.organizationId,
        postId: input.contentId,
      });
      if (result.canceled > 0) {
        trackServerEvent({
          event: POSTHOG_EVENTS.CONTENT_SCHEDULE_CANCELED,
          headers: context.headers,
          userId: auth.user.id,
          organizationId: input.organizationId,
          properties: { content_id: input.contentId },
        });
      }
      return {
        ...result,
        schedule: await getPostSchedule({
          organizationId: input.organizationId,
          postId: input.contentId,
        }),
      };
    }),
  publishNow: baseProcedure
    .input(contentInputSchema)
    .handler(async ({ context, input }) => {
      await assertOrganizationAccess({
        headers: context.headers,
        organizationId: input.organizationId,
      });
      await assertActiveSubscription(
        input.organizationId,
        "content.schedule.publishNow"
      );
      const moved = await publishPostScheduleNow({
        organizationId: input.organizationId,
        postId: input.contentId,
      });
      if (moved === 0) {
        const t = await getTranslations("errors.contentCalendar");
        throw notFound(t("nothingScheduled"));
      }
      publishDueNow(input.contentId);
      return {
        schedule: await getPostSchedule({
          organizationId: input.organizationId,
          postId: input.contentId,
        }),
      };
    }),
  retry: baseProcedure
    .input(scheduledPublicationIdInputSchema)
    .handler(async ({ context, input }) => {
      await assertOrganizationAccess({
        headers: context.headers,
        organizationId: input.organizationId,
      });
      await assertActiveSubscription(
        input.organizationId,
        "content.schedule.retry"
      );
      const result = await retryScheduledPublication({
        organizationId: input.organizationId,
        scheduledPublicationId: input.scheduledPublicationId,
      });
      if (!result.ok) {
        const t = await getTranslations("errors.contentCalendar");
        throw result.reason === "conflict"
          ? conflict(t("conflict"))
          : notFound(t("nothingScheduled"));
      }
      publishDueNow(result.postId);
      return {
        schedule: await getPostSchedule({
          organizationId: input.organizationId,
          postId: result.postId,
        }),
      };
    }),
};
