"use server";

import { db } from "@notra/db/drizzle";
import { socialConnections, users } from "@notra/db/schema";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import {
  signOutOptionsSchema,
  unlinkAccountInputSchema,
  updateUserInputSchema,
} from "@notra/schemas/dashboard/auth/user-actions";
import { getWorkOS, signOut, withAuth } from "@workos-inc/authkit-nextjs";
import { and, eq } from "drizzle-orm";
import { Effect } from "effect";

import { trackServerEvent } from "@/lib/analytics/posthog-server";
import { readRequestHeaders } from "@/lib/analytics/request-headers";
import { clearAuthSessionCookie } from "@/lib/auth/session-cookie";
import { isWorkOSNotFound } from "@/lib/auth/workos-error";
import { OrganizationActionError } from "@/lib/organizations/errors";
import { requireSession } from "@/lib/organizations/guards";
import { runOrganizationAction } from "@/lib/organizations/run-action";
import { validateActionInput } from "@/lib/organizations/validate-input";
import type { SessionUser } from "@/types/auth/session";
import type {
  SignOutActionOptions,
  UnlinkAccountInput,
  UpdateUserInput,
} from "@/types/auth/user-actions";
import type { AccountInfo, ActionResult } from "@/types/organizations/actions";

const tryAction = <T>(run: () => Promise<T>, message: string) =>
  Effect.tryPromise({
    try: run,
    catch: (cause) => new OrganizationActionError({ message, cause }),
  });

export async function signOutAction(options?: SignOutActionOptions) {
  const parsed = signOutOptionsSchema.safeParse(options);
  await signOut(parsed.success ? parsed.data : undefined);
}

export async function updateUserAction(
  rawInput: UpdateUserInput
): Promise<ActionResult<SessionUser>> {
  return runOrganizationAction(
    Effect.gen(function* () {
      const session = yield* requireSession();
      const input = yield* validateActionInput(updateUserInputSchema, rawInput);

      const updates: Partial<{
        name: string;
        image: string | null;
        hidePersonalData: boolean;
        showAgentStats: boolean;
      }> = {};

      if (input.name !== undefined) {
        updates.name = input.name;
      }
      if (input.image !== undefined) {
        updates.image = input.image;
      }
      if (input.hidePersonalData !== undefined) {
        updates.hidePersonalData = input.hidePersonalData;
      }
      if (input.showAgentStats !== undefined) {
        updates.showAgentStats = input.showAgentStats;
      }

      const [updated] = yield* tryAction(
        () =>
          db
            .update(users)
            .set(updates)
            .where(eq(users.id, session.user.id))
            .returning(),
        "Failed to update user"
      );

      if (!updated) {
        return yield* Effect.fail(
          new OrganizationActionError({ message: "User not found" })
        );
      }

      if (input.name !== undefined && updated.workosUserId) {
        const [firstName, ...rest] = input.name.split(" ");
        yield* tryAction(
          () =>
            getWorkOS().userManagement.updateUser({
              userId: updated.workosUserId ?? "",
              firstName,
              lastName: rest.join(" ") || undefined,
            }),
          "Failed to sync user profile"
        ).pipe(
          Effect.catch((error) =>
            Effect.logWarning("Could not sync user profile to WorkOS").pipe(
              Effect.annotateLogs({ userId: updated.id, error: error.message })
            )
          )
        );
      }

      return updated;
    })
  );
}

export async function deleteUserAction(): Promise<
  ActionResult<{ deleted: boolean }>
> {
  return runOrganizationAction(
    Effect.gen(function* () {
      const session = yield* requireSession();

      const { sessionId } = yield* tryAction(
        () => withAuth(),
        "Failed to read auth session"
      );

      if (sessionId) {
        yield* tryAction(
          () => getWorkOS().userManagement.revokeSession({ sessionId }),
          "Failed to revoke WorkOS session"
        ).pipe(
          Effect.catch((error) =>
            Effect.logWarning("Could not revoke WorkOS session").pipe(
              Effect.annotateLogs({
                userId: session.user.id,
                error: error.message,
              })
            )
          )
        );
      }

      if (session.user.workosUserId) {
        yield* tryAction(
          () =>
            getWorkOS().userManagement.deleteUser(
              session.user.workosUserId ?? ""
            ),
          "Failed to delete WorkOS user"
        ).pipe(
          Effect.catch((error) =>
            isWorkOSNotFound(error.cause)
              ? Effect.logWarning("WorkOS user was already deleted").pipe(
                  Effect.annotateLogs({ userId: session.user.id })
                )
              : Effect.fail(error)
          )
        );
      }

      const requestHeaders = yield* Effect.promise(readRequestHeaders);
      yield* Effect.sync(() => {
        trackServerEvent({
          event: POSTHOG_EVENTS.ACCOUNT_DELETED,
          headers: requestHeaders,
          userId: session.user.id,
          properties: { had_paid_history: null },
        });
      });

      yield* tryAction(
        () => db.delete(users).where(eq(users.id, session.user.id)),
        "Failed to delete user"
      );

      yield* tryAction(clearAuthSessionCookie, "Failed to clear session");

      return { deleted: true };
    })
  );
}

export async function requestPasswordResetAction(): Promise<
  ActionResult<{ sent: boolean }>
> {
  return runOrganizationAction(
    Effect.gen(function* () {
      const session = yield* requireSession();

      yield* tryAction(
        () =>
          getWorkOS().userManagement.createPasswordReset({
            email: session.user.email,
          }),
        "Failed to create password reset"
      );

      return { sent: true };
    })
  );
}

export async function listAccountsAction(): Promise<
  ActionResult<AccountInfo[]>
> {
  return runOrganizationAction(
    Effect.gen(function* () {
      const session = yield* requireSession();

      const rows = yield* tryAction(
        () =>
          db.query.socialConnections.findMany({
            where: eq(socialConnections.userId, session.user.id),
          }),
        "Failed to list connected accounts"
      );

      return rows.map((row) => ({
        id: row.id,
        providerId: row.provider,
        accountId: row.providerAccountId,
        scopes: row.scope?.split(" ").filter(Boolean) ?? [],
        createdAt: row.createdAt,
      }));
    })
  );
}

export async function unlinkAccountAction(
  rawInput: UnlinkAccountInput
): Promise<ActionResult<{ removed: boolean }>> {
  return runOrganizationAction(
    Effect.gen(function* () {
      const session = yield* requireSession();
      const input = yield* validateActionInput(
        unlinkAccountInputSchema,
        rawInput
      );

      yield* tryAction(
        () =>
          db
            .delete(socialConnections)
            .where(
              and(
                eq(socialConnections.userId, session.user.id),
                eq(socialConnections.provider, input.providerId)
              )
            ),
        "Failed to unlink account"
      );

      return { removed: true };
    })
  );
}
