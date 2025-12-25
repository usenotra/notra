"use server";

import { eq } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db/drizzle";
import { members, organizations } from "@/lib/db/schema";
import { LAST_VISITED_ORGANIZATION_COOKIE } from "@/utils/constants";

export async function validateOrganizationAccess(slug: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }

  const organization = await db.query.organizations.findFirst({
    where: eq(organizations.slug, slug),
    with: {
      members: {
        where: eq(members.userId, session.user.id),
      },
    },
  });

  if (!organization || organization.members.length === 0) {
    notFound();
  }

  return {
    organization,
    user: session.user,
    member: organization.members[0],
  };
}

export async function getSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return session;
}

export async function requireAuth() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }

  return {
    session: session.session,
    user: session.user,
  };
}

export async function getLastActiveOrganization(userId: string) {
  const cookieStore = await cookies();
  const lastVisitedOrgSlug = cookieStore.get(
    LAST_VISITED_ORGANIZATION_COOKIE
  )?.value;

  if (lastVisitedOrgSlug) {
    const organization = await db.query.organizations.findFirst({
      where: eq(organizations.slug, lastVisitedOrgSlug),
      columns: { slug: true, id: true },
      with: {
        members: {
          where: eq(members.userId, userId),
          columns: { id: true },
        },
      },
    });

    if (organization && organization.members.length > 0) {
      return { slug: organization.slug, id: organization.id };
    }
  }

  const ownerMembership = await db.query.members.findFirst({
    where: eq(members.userId, userId),
    columns: { organizationId: true, role: true },
    orderBy: (m, { desc }) => [desc(m.createdAt)],
  });

  if (ownerMembership) {
    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, ownerMembership.organizationId),
      columns: { slug: true, id: true },
    });

    if (org) {
      return { slug: org.slug, id: org.id };
    }
  }

  return;
}
