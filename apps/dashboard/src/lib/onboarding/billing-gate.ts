import { redirect } from "next/navigation";

import { findFirstPaidOrganization } from "@/lib/onboarding/first-paid-organization";

export async function redirectIfAnyOrganizationHasPaidHistory() {
  const paidOrg = await findFirstPaidOrganization();
  if (paidOrg) {
    redirect(`/${paidOrg.slug}`);
  }
}
