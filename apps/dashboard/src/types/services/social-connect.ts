import type {
  linkedInSelectionStashSchema,
  SocialConnectPlatform,
} from "@notra/schemas/dashboard/social-accounts";
import type * as z from "zod";

export interface BeginSocialConnectParams {
  organizationId: string;
  userId: string;
  platform: SocialConnectPlatform;
  callbackPath: string;
}

export interface CompleteSocialConnectParams {
  accountIds: string[];
  platform: SocialConnectPlatform | null;
  userId: string | null;
}

export interface CompleteSocialConnectResult {
  callbackPath: string;
  platform: SocialConnectPlatform;
  selectionToken?: string;
}

export type LinkedInSelectionStash = z.infer<
  typeof linkedInSelectionStashSchema
>;

export type LinkedInSelectionAccount =
  LinkedInSelectionStash["accounts"][number];

export interface RefreshedAccountStatus {
  username: string;
  status: "updated" | "missing";
}

export interface PublishSocialPostParams {
  organizationId: string;
  accountId: string;
  content: string;
}
