import { db } from "@notra/db/drizzle";
import { organizations } from "@notra/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { withGeoProject } from "@/utils/geo-paths";

export async function redirectIfOnboardingDismissed(
  organizationId: string,
  slug: string,
  projectId?: string,
  replay = false
) {
  if (replay) {
    return;
  }

  const organization = await db.query.organizations.findFirst({
    where: eq(organizations.id, organizationId),
    columns: { onboardingDismissed: true },
  });
  if (organization?.onboardingDismissed) {
    redirect(withGeoProject(`/${slug}`, projectId));
  }
}
