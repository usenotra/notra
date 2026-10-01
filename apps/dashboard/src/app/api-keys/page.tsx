import { redirect } from "next/navigation";

import { getLastActiveOrganization } from "@/lib/auth/actions";

export default async function Page() {
  const organization = await getLastActiveOrganization();

  redirect(organization ? `/${organization.slug}/api-keys` : "/onboarding");
}
