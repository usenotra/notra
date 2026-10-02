import { db } from "@notra/db/drizzle";
import { members } from "@notra/db/schema";
import { organizationIdSchema } from "@notra/schemas/dashboard/auth/organization";
import { ORPCError } from "@orpc/server";
import { and, eq } from "drizzle-orm";

import { retryTransientDbError } from "@/lib/db/retry";
import { getTranslations } from "@/lib/i18n/server";
import { getORPCRequestMemo } from "@/lib/orpc/context";
import type {
  AuthenticatedUser,
  AuthSession,
  OrganizationAuth,
  OrganizationAuthDependencies,
} from "@/types/auth/organization";

import { getServerSession } from "./session";

const organizationAuthDependencies: OrganizationAuthDependencies = {
  getServerSession,
  findMembership: async ({ organizationId, userId }) =>
    retryTransientDbError(() =>
      db.query.members.findFirst({
        where: and(
          eq(members.userId, userId),
          eq(members.organizationId, organizationId)
        ),
        columns: {
          id: true,
          role: true,
        },
      })
    ),
  hasDatabaseUrl: () => Boolean(process.env.DATABASE_URL),
};

export async function assertAuthenticatedWithDeps(
  { headers }: { headers: Headers },
  deps: Pick<
    OrganizationAuthDependencies,
    "getServerSession"
  > = organizationAuthDependencies
) {
  const memo = getORPCRequestMemo(headers);
  let lookup = memo?.sessionLookup;
  if (!lookup) {
    lookup = deps.getServerSession({ headers });
    if (memo) {
      memo.sessionLookup = lookup;
      lookup.catch(() => {
        memo.sessionLookup = undefined;
      });
    }
  }
  const { session, user } = (await lookup) as AuthSession;

  if (!(session && user)) {
    const tErrors = await getTranslations("errors.actions.organizations");
    throw new ORPCError("UNAUTHORIZED", {
      message: tErrors("signedOut"),
    });
  }

  return { session, user };
}

export async function assertAuthenticated(args: { headers: Headers }) {
  return assertAuthenticatedWithDeps(args);
}

/**
 * Batched oRPC calls arrive as one HTTP request, so every procedure in the
 * batch would otherwise repeat the same membership SELECT. The memo lives in a
 * WeakMap keyed by that request's `Headers`, so it cannot outlive the request.
 */
async function findMembershipMemoized(
  deps: Pick<OrganizationAuthDependencies, "findMembership">,
  headers: Headers,
  params: { organizationId: string; userId: string }
) {
  const memo = getORPCRequestMemo(headers);
  if (!memo) {
    return await deps.findMembership(params);
  }

  const cacheKey = `${params.userId}:${params.organizationId}`;
  let lookup = memo.membershipByUserOrganization.get(cacheKey);
  if (!lookup) {
    lookup = deps.findMembership(params);
    memo.membershipByUserOrganization.set(cacheKey, lookup);
  }
  return await lookup;
}

export async function assertOrganizationAccessWithDeps(
  {
    headers,
    organizationId,
    user,
  }: {
    headers: Headers;
    organizationId: string;
    user?: AuthenticatedUser;
  },
  deps: OrganizationAuthDependencies = organizationAuthDependencies
) {
  if (!deps.hasDatabaseUrl()) {
    const tErrors = await getTranslations("common.errors");
    throw new ORPCError("SERVICE_UNAVAILABLE", {
      message: tErrors("generic"),
    });
  }

  const safeOrganizationId = organizationIdSchema.safeParse(organizationId);
  if (!safeOrganizationId.success) {
    throw new ORPCError("BAD_REQUEST", {
      data: {
        issues: safeOrganizationId.error.issues,
      },
      message: (await getTranslations("errors.actions"))("invalidInput"),
    });
  }

  const authenticatedUser =
    user ?? (await assertAuthenticatedWithDeps({ headers }, deps)).user;

  const membership = await findMembershipMemoized(deps, headers, {
    userId: authenticatedUser.id,
    organizationId: safeOrganizationId.data,
  });

  if (!membership) {
    const tErrors = await getTranslations("errors.user");
    throw new ORPCError("FORBIDDEN", {
      message: tErrors("notMember"),
    });
  }

  return {
    user: authenticatedUser,
    organizationId: safeOrganizationId.data,
    membership,
  };
}

export async function assertOrganizationAccess({
  headers,
  organizationId,
  user,
}: {
  headers: Headers;
  organizationId: string;
  user?: AuthenticatedUser;
}) {
  return assertOrganizationAccessWithDeps({
    headers,
    organizationId,
    user,
  });
}

export async function withOrganizationAuth(
  request: Request,
  organizationId: string
): Promise<OrganizationAuth> {
  try {
    const context = await assertOrganizationAccess({
      headers: request.headers,
      organizationId,
    });

    return {
      success: true,
      context,
    };
  } catch (error) {
    if (error instanceof ORPCError) {
      return {
        success: false,
        response: Response.json(
          {
            error: error.message,
            ...(error.data ? { details: error.data } : {}),
          },
          { status: error.status }
        ),
      };
    }

    throw error;
  }
}
