import { getAllUserOrganizations } from "@/lib/auth/actions";
import { hasPaidSubscriptionHistory } from "@/lib/billing/subscription";

export async function findFirstPaidOrganization() {
  const allOrgs = await getAllUserOrganizations();
  const lookups = allOrgs.map((org) =>
    hasPaidSubscriptionHistory(org.id).then((paid) => (paid ? org : null))
  );
  for (const lookup of lookups) {
    const paidOrg = await lookup;
    if (paidOrg) {
      return paidOrg;
    }
  }
  return null;
}
