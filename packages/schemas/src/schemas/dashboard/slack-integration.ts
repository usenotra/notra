import "zod/compile";
// biome-ignore lint/performance/noNamespaceImport: Zod recommended way to import
import * as z from "zod";

export const slackAuthorizeQuerySchema = z.object({
  organizationId: z.string().min(1, "Organization ID is required"),
  callbackPath: z
    .string()
    .min(1)
    .refine((path) => path.startsWith("/") && !path.startsWith("//"), {
      message: "callbackPath must be a same-origin path",
    })
    .default("/"),
});
export type SlackAuthorizeQuery = z.infer<typeof slackAuthorizeQuerySchema>;

export const slackOAuthAccessResponseSchema = z.looseObject({
  ok: z.boolean(),
  error: z.string().optional(),
  access_token: z.string().optional(),
  bot_user_id: z.string().optional(),
  team: z
    .looseObject({
      id: z.string(),
      name: z.string().optional(),
    })
    .optional(),
});

export const updateSlackIntegrationBodySchema = z
  .object({
    enabled: z.boolean().optional(),
    displayName: z.string().trim().min(1).optional(),
    allowedChannelIds: z
      .array(z.string().min(1))
      .max(200)
      .nullable()
      .optional(),
    notificationChannelId: z.string().min(1).max(64).nullable().optional(),
  })
  .refine(
    (value) =>
      value.enabled !== undefined ||
      value.displayName !== undefined ||
      value.allowedChannelIds !== undefined ||
      value.notificationChannelId !== undefined,
    {
      message: "At least one field must be provided",
    }
  );

export const slackListChannelsOptionsSchema = z.object({
  refresh: z.boolean().optional(),
});

export const slackChannelListResponseSchema = z.looseObject({
  ok: z.boolean(),
  error: z.string().optional(),
  channels: z
    .array(
      z.looseObject({
        id: z.string(),
        name: z.string().optional(),
        is_private: z.boolean().optional(),
        is_archived: z.boolean().optional(),
        num_members: z.number().optional(),
      })
    )
    .optional(),
  response_metadata: z
    .looseObject({ next_cursor: z.string().optional() })
    .optional(),
});
