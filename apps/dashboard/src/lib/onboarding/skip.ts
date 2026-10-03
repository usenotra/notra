import { createServerFn } from "@tanstack/react-start";

const skipOnboardingServerFn = createServerFn({ method: "POST" })
  .validator((data: Parameters<typeof skipOnboardingImpl>) => data)
  .handler(({ data }) => skipOnboardingImpl(...data));
export const skipOnboarding = (
  ...data: Parameters<typeof skipOnboardingImpl>
) => skipOnboardingServerFn({ data });

import { db } from "@notra/db/drizzle";
import { organizations } from "@notra/db/schema";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import { redirect } from "@tanstack/react-router";
import { and, eq } from "drizzle-orm";

import { trackServerEvent } from "@/lib/analytics/posthog-server";
import { readRequestHeaders } from "@/lib/analytics/request-headers";
import { getSession, validateOrganizationAccess } from "@/lib/auth/actions";
import { validatedOnboardingProjectId } from "@/lib/onboarding/project";
import type { OnboardingStep } from "@/types/analytics/events";
import { withGeoProject } from "@/utils/geo-paths";

async function skipOnboardingImpl(slug: string, step: OnboardingStep) {
  const session = await getSession();
  if (!session?.user) {
    throw redirect({ href: "/login" });
  }

  const { organization, member } = await validateOrganizationAccess(slug);
  if (member?.role !== "owner" && member?.role !== "admin") {
    throw redirect({ href: `/${slug}` });
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

  throw redirect({ href: withGeoProject(`/${organization.slug}`, projectId) });
}
