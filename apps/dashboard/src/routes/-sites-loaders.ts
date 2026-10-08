import { createServerFn } from "@tanstack/react-start";

import { validateOrganizationAccess } from "@/lib/auth/actions";
import { isSitesEnabledForOrganization } from "@/lib/sites/flag";
import type { UiRouteInput } from "@/types/ui-route";

export const loadSitesEnabled = createServerFn({ method: "GET" })
  .validator((data: UiRouteInput) => data)
  .handler(async ({ data: { params } }) => {
    const { organization } = await validateOrganizationAccess(
      params.slug ?? ""
    );
    return isSitesEnabledForOrganization(organization.id);
  });
