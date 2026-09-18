import { db } from "@notra/db/drizzle";
import {
  brandSettings,
  organizationNotificationSettings,
  organizations,
} from "@notra/db/schema";
import { getGeoOnboardingStage } from "@notra/geo-core/geo/onboarding-status";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { ONBOARDING_STEP_WORKSPACE } from "@/constants/onboarding";
import { getLastActiveOrganization, getSession } from "@/lib/auth/actions";
import { redirectIfAnyOrganizationHasPaidHistory } from "@/lib/onboarding/billing-gate";
import { onboardingProgressHrefs } from "@/utils/onboarding-progress";

import { WorkspaceForm } from "./workspace-form";

export default async function OnboardingWorkspacePage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/login");
  }

  const existing = await getLastActiveOrganization();
  if (!existing) {
    await redirectIfAnyOrganizationHasPaidHistory();
    return <WorkspaceForm />;
  }

  const [brand, existingOrgRow, notificationSettings, stage] =
    await Promise.all([
      db.query.brandSettings.findFirst({
        where: eq(brandSettings.organizationId, existing.id),
        columns: { id: true },
      }),
      db.query.organizations.findFirst({
        where: eq(organizations.id, existing.id),
        columns: {
          heardAboutNotraOther: true,
          heardAboutNotraSource: true,
          id: true,
          logo: true,
          slug: true,
          name: true,
        },
      }),
      db.query.organizationNotificationSettings.findFirst({
        where: eq(organizationNotificationSettings.organizationId, existing.id),
        columns: {
          dailySummary: true,
          marketingEmails: true,
        },
      }),
      getGeoOnboardingStage(existing.id),
    ]);

  const progressHrefs = onboardingProgressHrefs({
    current: ONBOARDING_STEP_WORKSPACE,
    hasOrganization: true,
    hasBrand: Boolean(brand),
    stage,
  });

  if (!existingOrgRow) {
    return <WorkspaceForm progressHrefs={progressHrefs} />;
  }

  return (
    <WorkspaceForm
      existingOrg={{
        ...existingOrgRow,
        dailySummary: notificationSettings?.dailySummary ?? true,
        marketingEmails: notificationSettings?.marketingEmails ?? true,
      }}
      progressHrefs={progressHrefs}
    />
  );
}
