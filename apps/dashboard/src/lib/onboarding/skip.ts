"use server";

import { db } from "@notra/db/drizzle";
import { organizations } from "@notra/db/schema";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { trackServerEvent } from "@/lib/analytics/posthog-server";
import { readRequestHeaders } from "@/lib/analytics/request-headers";
import { getSession, validateOrganizationAccess } from "@/lib/auth/actions";
import { validatedOnboardingProjectId } from "@/lib/onboarding/project";
import type { OnboardingStep } from "@/types/analytics/events";
import { withGeoProject } from "@/utils/geo-paths";

export async function skipOnboarding(slug: string, step: OnboardingStep) {
  const session = await getSession();
  if (!session?.user) {
    redirect("/login");
  }

  const { organization, member } = await validateOrganizationAccess(slug);
  if (member?.role !== "owner" && member?.role !== "admin") {
    redirect(`/${slug}`);
  }

  const requestHeaders = await readRequestHeaders();
  const requestedProjectId =
    URL.parse(requestHeaders?.get("referer") ?? "")?.searchParams.get(
      "project"
    ) ?? undefined;
  // Validate before writing so a failed lookup cannot leave onboarding dismissed.
  const projectId = await validatedOnboardingProjectId(
    organization.id,
    requestedProjectId
  );

  const [updated] = await db
    .update(organizations)
    .set({ onboardingDismissed: true })
    .where(
      and(
        eq(organizations.id, organization.id),
        eq(organizations.onboardingDismissed, false)
      )
    )
    .returning({ id: organizations.id });
  if (updated) {
    trackServerEvent({
      event: POSTHOG_EVENTS.ONBOARDING_STEP_SKIPPED,
      headers: requestHeaders,
      organizationId: organization.id,
      projectId,
      properties: { step, scope: "onboarding" },
      userId: session.user.id,
    });
  }

  redirect(withGeoProject(`/${organization.slug}`, projectId));
}
