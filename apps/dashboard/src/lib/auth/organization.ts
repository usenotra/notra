import { db } from "@notra/db/drizzle";
import { members } from "@notra/db/schema";
import { organizationIdSchema } from "@notra/schemas/dashboard/auth/organization";
import { ORPCError } from "@orpc/server";
import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

import { retryTransientDbError } from "@/lib/db/retry";
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
  const { session, user } = (await deps.getServerSession({
    headers,
  })) as AuthSession;

  if (!(session && user)) {
    throw new ORPCError("UNAUTHORIZED", {
      message: "Unauthorized",
    });
  }

  return { session, user };
}

export async function assertAuthenticated(args: { headers: Headers }) {
  return assertAuthenticatedWithDeps(args);
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
    throw new ORPCError("SERVICE_UNAVAILABLE", {
      message: "Database unavailable",
    });
  }

  const safeOrganizationId = organizationIdSchema.safeParse(organizationId);
  if (!safeOrganizationId.success) {
    throw new ORPCError("BAD_REQUEST", {
      data: {
        issues: safeOrganizationId.error.issues,
      },
      message: "Invalid organization ID",
    });
  }

  const authenticatedUser =
    user ?? (await assertAuthenticatedWithDeps({ headers }, deps)).user;

  const membership = await deps.findMembership({
    userId: authenticatedUser.id,
    organizationId: safeOrganizationId.data,
  });

  if (!membership) {
    throw new ORPCError("FORBIDDEN", {
      message: "You do not have access to this organization",
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
  request: NextRequest,
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
        response: NextResponse.json(
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
