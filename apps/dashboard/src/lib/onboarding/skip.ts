"use server";

import { db } from "@notra/db/drizzle";
import { organizations } from "@notra/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { getLastActiveOrganization, getSession } from "@/lib/auth/actions";

export async function skipOnboarding() {
  const session = await getSession();
  if (!session?.user) {
    redirect("/login");
  }

  const organization = await getLastActiveOrganization();
  if (!organization) {
    redirect("/onboarding/workspace");
  }

  await db
    .update(organizations)
    .set({ onboardingDismissed: true })
    .where(eq(organizations.id, organization.id));

  redirect(`/${organization.slug}`);
}
