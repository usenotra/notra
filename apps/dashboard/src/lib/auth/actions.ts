"use server";

import { db } from "@notra/db/drizzle";
import { members, organizations, projects } from "@notra/db/schema";
import { organizationSlugParamSchema } from "@notra/schemas/dashboard/auth/organization";
import { and, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";

import { LAST_VISITED_ORGANIZATION_COOKIE } from "@/constants/cookies";
import { isSessionBanned } from "@/lib/auth/banned";
import { getAuthIdentity, getAuthSession } from "@/lib/auth/server";
import { retryTransientDbError } from "@/lib/db/retry";
import { getLastVisitedProject } from "@/utils/cookies";

const getOrganizationAccess = cache(async (rawSlug: string) => {
  const slugValidation = organizationSlugParamSchema.safeParse(rawSlug);

  if (!slugValidation.success) {
    notFound();
  }

  const slug = slugValidation.data;
  const session = await getAuthIdentity();

  if (!session?.user) {
    if (await isSessionBanned()) {
      redirect("/auth/banned");
    }
    redirect(`/login?returnTo=${encodeURIComponent(`/${slug}`)}`);
  }

  const organization = await retryTransientDbError(() =>
    db.query.organizations.findFirst({
      where: eq(organizations.slug, slug),
      with: {
        members: {
          where: eq(members.userId, session.user.id),
        },
      },
    })
  );

  if (!organization || organization.members.length === 0) {
    notFound();
  }

  return {
    organization,
    user: session.user,
    member: organization.members[0],
  };
});

export async function validateOrganizationAccess(rawSlug: string) {
  return getOrganizationAccess(rawSlug);
}

export async function getSession() {
  const session = await getAuthSession();

  return session;
}

/**
 * Authenticated user, without resolving the active organization. Callers that
 * need the active organization should read the session via `getSession`.
 */
export async function requireAuthIdentity() {
  const identity = await getAuthIdentity();

  if (!identity?.user) {
    if (await isSessionBanned()) {
      redirect("/auth/banned");
    }
    redirect("/login");
  }

  return identity;
}

async function getLastActiveOrganizationForUser(userId: string) {
  const cookieStore = await cookies();
  const lastVisitedOrgSlug = cookieStore.get(
    LAST_VISITED_ORGANIZATION_COOKIE
  )?.value;
  let activeOrganization: { id: string; slug: string } | undefined;

  if (lastVisitedOrgSlug) {
    const organization = await retryTransientDbError(() =>
      db.query.organizations.findFirst({
        where: eq(organizations.slug, lastVisitedOrgSlug),
        columns: { slug: true, id: true },
        with: {
          members: {
            where: eq(members.userId, userId),
            columns: { id: true },
          },
        },
      })
    );

    if (organization && organization.members.length > 0) {
      activeOrganization = { slug: organization.slug, id: organization.id };
    }
  }

  if (!activeOrganization) {
    const membership = await retryTransientDbError(() =>
      db.query.members.findFirst({
        where: eq(members.userId, userId),
        columns: { organizationId: true },
        orderBy: (m, { desc }) => [desc(m.createdAt)],
      })
    );

    if (membership) {
      activeOrganization = await retryTransientDbError(() =>
        db.query.organizations.findFirst({
          where: eq(organizations.id, membership.organizationId),
          columns: { slug: true, id: true },
        })
      );
    }
  }

  if (!activeOrganization) {
    return;
  }

  const organization = activeOrganization;
  const lastVisitedProjectId = getLastVisitedProject(
    cookieStore,
    organization.slug
  );
  const project = lastVisitedProjectId
    ? await retryTransientDbError(() =>
        db.query.projects.findFirst({
          where: and(
            eq(projects.id, lastVisitedProjectId),
            eq(projects.organizationId, organization.id)
          ),
          columns: { id: true },
        })
      )
    : undefined;

  return { ...organization, projectId: project?.id };
}

export async function getLastActiveOrganization() {
  const session = await getAuthSession();

  if (!session?.user) {
    return;
  }

  return getLastActiveOrganizationForUser(session.user.id);
}

async function getAllOrganizationsForUser(userId: string) {
  return retryTransientDbError(() =>
    db
      .select({ slug: organizations.slug, id: organizations.id })
      .from(members)
      .innerJoin(organizations, eq(organizations.id, members.organizationId))
      .where(eq(members.userId, userId))
  );
}

export async function getAllUserOrganizations() {
  const session = await getAuthSession();

  if (!session?.user) {
    return [];
  }

  return getAllOrganizationsForUser(session.user.id);
}
