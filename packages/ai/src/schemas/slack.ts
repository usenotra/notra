import { Schema } from "effect";
import { z } from "zod";

export class SlackConfigurationError extends Schema.TaggedError<SlackConfigurationError>()(
  "SlackConfigurationError",
  { variable: Schema.String }
) {}

export class SlackInputError extends Schema.TaggedError<SlackInputError>()(
  "SlackInputError",
  { message: Schema.String }
) {}

export class SlackRequestError extends Schema.TaggedError<SlackRequestError>()(
  "SlackRequestError",
  {
    cause: Schema.Defect(),
    operation: Schema.String,
    status: Schema.optional(Schema.Number),
  }
) {}

export class SlackResponseError extends Schema.TaggedError<SlackResponseError>()(
  "SlackResponseError",
  {
    cause: Schema.Defect(),
    operation: Schema.String,
  }
) {}

export class SlackApiError extends Schema.TaggedError<SlackApiError>()(
  "SlackApiError",
  {
    code: Schema.String,
    operation: Schema.String,
  }
) {}

export class SlackSetupError extends Schema.TaggedError<SlackSetupError>()(
  "SlackSetupError",
  {
    archiveCause: Schema.optional(Schema.Defect()),
    archived: Schema.Boolean,
    cause: Schema.Defect(),
    channelName: Schema.String,
  }
) {}

export const slackInviteSharedResponseSchema = z.looseObject({
  ok: z.boolean(),
  error: z.string().optional(),
  invite_id: z.string().optional(),
  is_legacy_shared_channel: z.boolean().optional(),
});

export const slackOkResponseSchema = z.looseObject({
  ok: z.boolean(),
  error: z.string().optional(),
});

export const slackCreateChannelResponseSchema = z.looseObject({
  ok: z.boolean(),
  error: z.string().optional(),
  channel: z
    .looseObject({
      id: z.string(),
      name: z.string(),
    })
    .optional(),
});
