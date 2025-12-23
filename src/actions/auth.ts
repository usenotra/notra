"use server";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db/drizzle";
import { members, organizations } from "@/lib/db/schema";

export async function validateWorkspaceAccess(slug: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }

  const workspace = await db.query.organizations.findFirst({
    where: eq(organizations.slug, slug),
    with: {
      members: {
        where: eq(members.userId, session.user.id),
      },
    },
  });

  if (!workspace || workspace.members.length === 0) {
    notFound();
  }

  return {
    workspace,
    user: session.user,
    member: workspace.members[0],
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
