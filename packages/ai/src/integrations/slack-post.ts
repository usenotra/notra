import { db } from "@notra/db/drizzle";
import { slackIntegrations } from "@notra/db/schema";
import { and, eq } from "drizzle-orm";
import { Effect } from "effect";

import {
  SLACK_API_BASE_URL,
  SLACK_REQUEST_TIMEOUT_MS,
} from "../constants/slack";
import {
  SLACK_INVALID_RESPONSE_ERROR_CODE,
  SLACK_NETWORK_ERROR_CODE,
  SLACK_POST_MESSAGE_METHOD,
  SLACK_RATE_LIMITED_ERROR_CODE,
  SLACK_RATE_LIMITED_STATUS,
  SLACK_RETRYABLE_ERROR_CODES,
  SLACK_SERVER_ERROR_MIN_STATUS,
  SLACK_TERMINAL_ERROR_CODES,
  SLACK_UNKNOWN_ERROR_CODE,
  SLACK_UPDATE_MESSAGE_METHOD,
} from "../constants/slack-delivery";
import {
  SlackChannelNotConfiguredError,
  SlackDeliveryRetryableError,
  SlackDeliveryTerminalError,
  slackApiResponseSchema,
} from "../schemas/slack-delivery";
import type {
  PostSlackMessageInput,
  PostSlackMessageResult,
  SlackApiRequestBody,
  UpdateSlackMessageInput,
  UpdateSlackMessageResult,
} from "../types/slack-delivery";
import { getSlackIntegrationBotToken } from "./slack-workspace";

const resolveNotificationTarget = Effect.fn("iris.slack.resolveTarget")(
  function* (organizationId: string, teamId?: string | null) {
    const integrations = yield* Effect.tryPromise({
      try: () =>
        db.query.slackIntegrations.findMany({
          where: and(
            eq(slackIntegrations.organizationId, organizationId),
            eq(slackIntegrations.enabled, true)
          ),
          orderBy: (integration, { asc }) => [asc(integration.createdAt)],
        }),
      catch: (cause) =>
        new SlackDeliveryRetryableError({
          code: SLACK_NETWORK_ERROR_CODE,
          operation: "resolveTarget",
          organizationId,
          retryAfterSeconds: null,
          cause,
        }),
    });

    const withChannel = integrations.filter(
      (candidate) => candidate.notificationChannelId !== null
    );

    const integration = teamId
      ? withChannel.find((candidate) => candidate.slackTeamId === teamId)
      : withChannel.at(0);

    if (!integration?.notificationChannelId) {
      return yield* Effect.fail(
        new SlackChannelNotConfiguredError({ organizationId })
      );
    }

    return {
      channelId: integration.notificationChannelId,
      teamId: integration.slackTeamId,
      token: getSlackIntegrationBotToken(integration),
    };
  }
);

function parseRetryAfterSeconds(response: Response): number | null {
  const header = response.headers.get("retry-after");
  if (!header) {
    return null;
  }
  const seconds = Number(header);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds : null;
}

const callSlackApi = Effect.fn("iris.slack.request")(function* (input: {
  organizationId: string;
  operation: string;
  token: string;
  body: SlackApiRequestBody;
}) {
  return yield* Effect.acquireUseRelease(
    Effect.sync(() => new AbortController()),
    (controller) =>
      Effect.gen(function* () {
        const response = yield* Effect.tryPromise({
          try: () =>
            fetch(`${SLACK_API_BASE_URL}/${input.operation}`, {
              method: "POST",
              headers: {
                authorization: `Bearer ${input.token}`,
                "content-type": "application/json; charset=utf-8",
              },
              body: JSON.stringify(input.body),
              signal: AbortSignal.any([
                controller.signal,
                AbortSignal.timeout(SLACK_REQUEST_TIMEOUT_MS),
              ]),
            }),
          catch: (cause) =>
            new SlackDeliveryRetryableError({
              code: SLACK_NETWORK_ERROR_CODE,
              operation: input.operation,
              organizationId: input.organizationId,
              retryAfterSeconds: null,
              cause,
            }),
        });

        if (
          response.status === SLACK_RATE_LIMITED_STATUS ||
          response.status >= SLACK_SERVER_ERROR_MIN_STATUS
        ) {
          return yield* Effect.fail(
            new SlackDeliveryRetryableError({
              code:
                response.status === SLACK_RATE_LIMITED_STATUS
                  ? SLACK_RATE_LIMITED_ERROR_CODE
                  : `http_${response.status}`,
              operation: input.operation,
              organizationId: input.organizationId,
              retryAfterSeconds: parseRetryAfterSeconds(response),
              cause: null,
            })
          );
        }

        if (!response.ok) {
          return yield* Effect.fail(
            new SlackDeliveryTerminalError({
              code: `http_${response.status}`,
              operation: input.operation,
              organizationId: input.organizationId,
            })
          );
        }

        const body = yield* Effect.tryPromise({
          try: () => response.json(),
          catch: (cause) =>
            new SlackDeliveryRetryableError({
              code: SLACK_INVALID_RESPONSE_ERROR_CODE,
              operation: input.operation,
              organizationId: input.organizationId,
              retryAfterSeconds: null,
              cause,
            }),
        });

        const parsed = slackApiResponseSchema.safeParse(body);
        if (!parsed.success) {
          return yield* Effect.fail(
            new SlackDeliveryRetryableError({
              code: SLACK_INVALID_RESPONSE_ERROR_CODE,
              operation: input.operation,
              organizationId: input.organizationId,
              retryAfterSeconds: null,
              cause: parsed.error,
            })
          );
        }

        if (!parsed.data.ok) {
          const code = parsed.data.error ?? SLACK_UNKNOWN_ERROR_CODE;
          if (
            SLACK_RETRYABLE_ERROR_CODES.has(code) &&
            !SLACK_TERMINAL_ERROR_CODES.has(code)
          ) {
            return yield* Effect.fail(
              new SlackDeliveryRetryableError({
                code,
                operation: input.operation,
                organizationId: input.organizationId,
                retryAfterSeconds: null,
                cause: null,
              })
            );
          }

          return yield* Effect.fail(
            new SlackDeliveryTerminalError({
              code,
              operation: input.operation,
              organizationId: input.organizationId,
            })
          );
        }

        return parsed.data;
      }),
    (controller) => Effect.sync(() => controller.abort())
  );
});

export const postSlackMessage = Effect.fn("iris.slack.postMessage")(function* (
  input: PostSlackMessageInput
) {
  const target = yield* resolveNotificationTarget(input.organizationId);

  const result = yield* callSlackApi({
    organizationId: input.organizationId,
    operation: SLACK_POST_MESSAGE_METHOD,
    token: target.token,
    body: {
      channel: target.channelId,
      text: input.text,
      ...(input.blocks ? { blocks: input.blocks } : {}),
    },
  });

  const delivered: PostSlackMessageResult = {
    channel: result.channel ?? target.channelId,
    ts: result.ts ?? "",
    teamId: target.teamId,
  };

  yield* Effect.logInfo("Iris Slack card delivered").pipe(
    Effect.annotateLogs({
      organizationId: input.organizationId,
      channel: delivered.channel,
      ts: delivered.ts,
    })
  );

  return delivered;
});

export const updateSlackMessage = Effect.fn("iris.slack.updateMessage")(
  function* (input: UpdateSlackMessageInput) {
    const target = yield* resolveNotificationTarget(
      input.organizationId,
      input.teamId
    );

    const result = yield* callSlackApi({
      organizationId: input.organizationId,
      operation: SLACK_UPDATE_MESSAGE_METHOD,
      token: target.token,
      body: {
        channel: input.channel,
        ts: input.ts,
        text: input.text,
        ...(input.blocks ? { blocks: input.blocks } : {}),
      },
    });

    const updated: UpdateSlackMessageResult = {
      channel: result.channel ?? input.channel,
      ts: result.ts ?? input.ts,
    };

    return updated;
  }
);
