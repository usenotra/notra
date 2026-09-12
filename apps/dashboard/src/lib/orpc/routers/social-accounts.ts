import { db } from "@notra/db/drizzle";
import { connectedSocialAccounts } from "@notra/db/schema";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import {
  beginConnectInputSchema,
  disconnectSocialAccountInputSchema,
  linkedinSelectionCompleteInputSchema,
  linkedinSelectionGetInputSchema,
  publishSocialPostInputSchema,
  refreshSocialAccountsInputSchema,
  socialAccountsOrganizationInputSchema,
  socialConnectPlatformSchema,
} from "@notra/schemas/dashboard/social-accounts";
import { and, eq } from "drizzle-orm";
import { Effect } from "effect";

import { trackServerEvent } from "@/lib/analytics/posthog-server";
import { assertOrganizationAccess } from "@/lib/auth/organization";
import { authorizedProcedure } from "@/lib/orpc/base";
import { runSocialConnect } from "@/lib/orpc/utils/social-connect";
import {
  beginSocialConnect,
  disconnectProviderAccount,
} from "@/lib/social-connect/connect";
import {
  completeLinkedInSelection,
  getLinkedInSelection,
} from "@/lib/social-connect/linkedin-selection";
import { publishSocialPost } from "@/lib/social-connect/publish";
import { refreshConnectedAccounts } from "@/lib/social-connect/refresh";

import { notFound } from "../utils/errors";

export const socialAccountsRouter = {
  list: authorizedProcedure
    .input(socialAccountsOrganizationInputSchema)
    .handler(async ({ context, input }) => {
      await assertOrganizationAccess({
        headers: context.headers,
        organizationId: input.organizationId,
        user: context.user,
      });

      const accounts = await db.query.connectedSocialAccounts.findMany({
        columns: {
          createdAt: true,
          displayName: true,
          id: true,
          profileImageUrl: true,
          provider: true,
          providerAccountId: true,
          username: true,
          verified: true,
          verifiedType: true,
        },
        where: eq(connectedSocialAccounts.organizationId, input.organizationId),
      });

      return {
        accounts: accounts.map((account) => ({
          ...account,
          createdAt: account.createdAt.toISOString(),
        })),
      };
    }),
  disconnect: authorizedProcedure
    .input(disconnectSocialAccountInputSchema)
    .handler(async ({ context, input }) => {
      await assertOrganizationAccess({
        headers: context.headers,
        organizationId: input.organizationId,
        user: context.user,
      });

      const existing = await db.query.connectedSocialAccounts.findFirst({
        columns: { id: true, providerAccountId: true, provider: true },
        where: and(
          eq(connectedSocialAccounts.id, input.accountId),
          eq(connectedSocialAccounts.organizationId, input.organizationId)
        ),
      });

      if (!existing) {
        throw notFound("Account not found");
      }

      const parsedPlatform = socialConnectPlatformSchema.safeParse(
        existing.provider
      );
      if (parsedPlatform.success) {
        await runSocialConnect(
          disconnectProviderAccount(
            existing.providerAccountId,
            parsedPlatform.data
          ).pipe(Effect.map(() => undefined)),
          { logLabel: "Failed to disconnect account" }
        );
      }

      await db
        .delete(connectedSocialAccounts)
        .where(eq(connectedSocialAccounts.id, input.accountId));

      trackServerEvent({
        event: POSTHOG_EVENTS.SOCIAL_ACCOUNT_DISCONNECTED,
        headers: context.headers,
        userId: context.user.id,
        organizationId: input.organizationId,
        properties: {
          platform: existing.provider,
          account_id: existing.id,
        },
      });

      return { success: true };
    }),
  refresh: authorizedProcedure
    .input(refreshSocialAccountsInputSchema)
    .handler(async ({ context, input }) => {
      await assertOrganizationAccess({
        headers: context.headers,
        organizationId: input.organizationId,
        user: context.user,
      });

      const result = await runSocialConnect(
        refreshConnectedAccounts(input.organizationId, input.accountId),
        { logLabel: "Failed to refresh connected accounts" }
      );

      return { accounts: result.accounts };
    }),
  publish: authorizedProcedure
    .input(publishSocialPostInputSchema)
    .handler(async ({ context, input }) => {
      await assertOrganizationAccess({
        headers: context.headers,
        organizationId: input.organizationId,
        user: context.user,
      });

      const result = await runSocialConnect(
        publishSocialPost({
          organizationId: input.organizationId,
          accountId: input.accountId,
          content: input.content,
        }),
        { logLabel: "Failed to publish post", reconnectHint: true }
      );

      trackServerEvent({
        event: POSTHOG_EVENTS.CONTENT_SOCIAL_PUBLISHED,
        headers: context.headers,
        userId: context.user.id,
        organizationId: input.organizationId,
        properties: {
          platform: result.platform,
          from: input.from ?? null,
          account_id: input.accountId,
        },
      });

      return {
        postId: result.postId,
        platformPostId: result.platformPostId,
        postUrl: result.postUrl,
        username: result.username,
      };
    }),
  linkedinSelectionGet: authorizedProcedure
    .input(linkedinSelectionGetInputSchema)
    .handler(async ({ context, input }) => {
      const stash = await runSocialConnect(getLinkedInSelection(input.token), {
        logLabel: "Failed to load LinkedIn selection",
      });

      await assertOrganizationAccess({
        headers: context.headers,
        organizationId: stash.organizationId,
        user: context.user,
      });

      if (stash.userId !== context.user.id) {
        throw notFound("Connection attempt not found");
      }

      return {
        accounts: stash.accounts,
        organizationId: stash.organizationId,
        callbackPath: stash.callbackPath,
      };
    }),
  linkedinSelectionComplete: authorizedProcedure
    .input(linkedinSelectionCompleteInputSchema)
    .handler(async ({ context, input }) => {
      const stash = await runSocialConnect(getLinkedInSelection(input.token), {
        logLabel: "Failed to load LinkedIn selection",
      });

      await assertOrganizationAccess({
        headers: context.headers,
        organizationId: stash.organizationId,
        user: context.user,
      });

      if (stash.userId !== context.user.id) {
        throw notFound("Connection attempt not found");
      }

      const result = await runSocialConnect(
        completeLinkedInSelection({
          token: input.token,
          accountIds: input.accountIds,
        }),
        { logLabel: "Failed to complete LinkedIn selection" }
      );

      trackServerEvent({
        event: POSTHOG_EVENTS.SOCIAL_ACCOUNT_CONNECTED,
        headers: context.headers,
        userId: context.user.id,
        organizationId: stash.organizationId,
        properties: {
          platform: "linkedin",
          account_count: input.accountIds.length,
        },
      });

      return { callbackPath: result.callbackPath };
    }),
  beginConnect: authorizedProcedure
    .input(beginConnectInputSchema)
    .handler(async ({ context, input }) => {
      await assertOrganizationAccess({
        headers: context.headers,
        organizationId: input.organizationId,
        user: context.user,
      });

      const result = await runSocialConnect(
        beginSocialConnect({
          organizationId: input.organizationId,
          userId: context.user.id,
          platform: input.platform,
          callbackPath: input.callbackPath,
        }),
        { logLabel: "Failed to create account connect link" }
      );

      return { url: result.url };
    }),
};
