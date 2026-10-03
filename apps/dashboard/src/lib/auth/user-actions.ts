import { createServerFn } from "@tanstack/react-start";

const signOutServerFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    if (!Array.isArray(data)) {
      throw new Error("Invalid action arguments");
    }
    return data as Parameters<typeof signOutActionImpl>;
  })
  .handler(({ data }) => signOutActionImpl(...data));
export const signOutAction = (...data: Parameters<typeof signOutActionImpl>) =>
  signOutServerFn({ data });

const updateUserServerFn = createServerFn({ method: "POST" })
  .validator((data: Parameters<typeof updateUserActionImpl>) => data)
  .handler(({ data }) => updateUserActionImpl(...data));
export const updateUserAction = (
  ...data: Parameters<typeof updateUserActionImpl>
) => updateUserServerFn({ data });

const deleteUserServerFn = createServerFn({ method: "POST" }).handler(() =>
  deleteUserActionImpl()
);
export const deleteUserAction = () => deleteUserServerFn();

const requestPasswordResetServerFn = createServerFn({ method: "POST" }).handler(
  () => requestPasswordResetActionImpl()
);
export const requestPasswordResetAction = () => requestPasswordResetServerFn();

const listAccountsServerFn = createServerFn({ method: "POST" }).handler(() =>
  listAccountsActionImpl()
);
export const listAccountsAction = () => listAccountsServerFn();

const unlinkAccountServerFn = createServerFn({ method: "POST" })
  .validator((data: Parameters<typeof unlinkAccountActionImpl>) => data)
  .handler(({ data }) => unlinkAccountActionImpl(...data));
export const unlinkAccountAction = (
  ...data: Parameters<typeof unlinkAccountActionImpl>
) => unlinkAccountServerFn({ data });

import { db } from "@notra/db/drizzle";
import { socialConnections, users } from "@notra/db/schema";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import {
  signOutOptionsSchema,
  unlinkAccountInputSchema,
  updateUserInputSchema,
} from "@notra/schemas/dashboard/auth/user-actions";
import { isDemoMode } from "@notra/utils/demo-mode";
import { redirect } from "@tanstack/react-router";
import { getWorkOS } from "@workos/authkit-session";
import { getAuthKitContext } from "@workos/authkit-tanstack-react-start";
import { and, eq } from "drizzle-orm";
import { Effect } from "effect";

import {
  DEMO_DISABLED_MESSAGE,
  DEMO_EXIT_URL,
  DEMO_SESSION_COOKIE,
} from "@/constants/demo";
import { ActionFailure } from "@/lib/actions/errors";
import { runAction } from "@/lib/actions/run-action";
import { validateActionInput } from "@/lib/actions/validate-input";
import { trackServerEvent } from "@/lib/analytics/posthog-server";
import { readRequestHeaders } from "@/lib/analytics/request-headers";
import { clearAuthSessionCookie } from "@/lib/auth/session-cookie";
import { clearSignedCookie } from "@/lib/auth/signed-cookie";
import { signOutAuthSession } from "@/lib/auth/workos";
import { isWorkOSNotFound } from "@/lib/auth/workos-error";
import { clearLocaleCookie, writeLocaleCookie } from "@/lib/i18n/locale-cookie";
import { organizationActionMessage } from "@/lib/organizations/action-messages";
import { requireSession } from "@/lib/organizations/guards";
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
    catch: (cause) => new ActionFailure({ message, cause }),
  });

async function signOutActionImpl(options?: SignOutActionOptions) {
  const parsed = signOutOptionsSchema.safeParse(options);
  await clearLocaleCookie();
  // Leaving the public demo drops the sandbox cookie; the sandbox itself
  // expires on its own.
  if (isDemoMode()) {
    await clearSignedCookie(DEMO_SESSION_COOKIE);
    throw redirect({ href: DEMO_EXIT_URL });
  }
  await signOutAuthSession(parsed.success ? parsed.data : undefined);
}

async function updateUserActionImpl(
  rawInput: UpdateUserInput
): Promise<ActionResult<SessionUser>> {
  return runAction(
    Effect.gen(function* () {
      const session = yield* requireSession();
      const input = yield* validateActionInput(updateUserInputSchema, rawInput);

      const updates: Partial<{
        name: string;
        image: string | null;
        hidePersonalData: boolean;
        showAgentStats: boolean;
        locale: string | null;
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
      if (input.locale !== undefined) {
        updates.locale = input.locale;
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
          new ActionFailure({
            message: yield* organizationActionMessage(
              "actions.organizations.userNotFound"
            ),
          })
        );
      }

      if (input.locale !== undefined) {
        const locale = input.locale;
        yield* Effect.promise(() => writeLocaleCookie(locale));
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

async function deleteUserActionImpl(): Promise<
  ActionResult<{ deleted: boolean }>
> {
  return runAction(
    Effect.gen(function* () {
      if (isDemoMode()) {
        return yield* Effect.fail(
          new ActionFailure({ message: DEMO_DISABLED_MESSAGE })
        );
      }
      const session = yield* requireSession();

      const auth = yield* tryAction(
        async () => getAuthKitContext().auth(),
        "Failed to read auth session"
      );

      if (auth.user && auth.sessionId) {
        yield* tryAction(
          () =>
            getWorkOS().userManagement.revokeSession({
              sessionId: auth.sessionId,
            }),
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
      yield* Effect.promise(clearLocaleCookie);

      return { deleted: true };
    })
  );
}

async function requestPasswordResetActionImpl(): Promise<
  ActionResult<{ sent: boolean }>
> {
  return runAction(
    Effect.gen(function* () {
      if (isDemoMode()) {
        return yield* Effect.fail(
          new ActionFailure({ message: DEMO_DISABLED_MESSAGE })
        );
      }
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

async function listAccountsActionImpl(): Promise<ActionResult<AccountInfo[]>> {
  return runAction(
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

async function unlinkAccountActionImpl(
  rawInput: UnlinkAccountInput
): Promise<ActionResult<{ removed: boolean }>> {
  return runAction(
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
