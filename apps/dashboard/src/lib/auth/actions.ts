"use server";

import { db } from "@notra/db/drizzle";
import { invitations, members, organizations } from "@notra/db/schema";
import { eq } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";
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
    const fallbackOrganization = await getLastActiveOrganization(
      session.user.id
    );
    if (fallbackOrganization && fallbackOrganization.slug !== slug) {
      redirect(`/${fallbackOrganization.slug}`);
    }
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

export async function getInvitationById(invitationId: string): Promise<{
  id: string;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  inviterEmail: string;
  inviterName: string;
  inviterId: string;
  email: string;
  role: string | null;
  status: "pending" | "accepted" | "rejected" | "canceled";
  expiresAt: Date;
  expired: boolean;
} | null> {
  const invitation = await db.query.invitations.findFirst({
    where: eq(invitations.id, invitationId),
    with: {
      organizations: {
        columns: {
          id: true,
          name: true,
          slug: true,
        },
      },
      users: {
        columns: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
  });

  if (!invitation) {
    return null;
  }

  const isExpired = invitation.expiresAt < new Date();

  return {
    id: invitation.id,
    organizationId: invitation.organizationId,
    organizationName: invitation.organizations.name,
    organizationSlug: invitation.organizations.slug,
    inviterEmail: invitation.users.email,
    inviterName: invitation.users.name,
    inviterId: invitation.inviterId,
    email: invitation.email,
    role: invitation.role,
    status: invitation.status as
      | "pending"
      | "accepted"
      | "rejected"
      | "canceled",
    expiresAt: invitation.expiresAt,
    expired: isExpired,
  };
}
