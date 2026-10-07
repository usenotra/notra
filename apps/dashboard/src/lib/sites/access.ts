import { assertOrganizationAccess } from "@/lib/auth/organization";
import { getORPCRequestMemo } from "@/lib/orpc/context";
import { forbidden } from "@/lib/orpc/utils/errors";
import { isSitesEnabledForOrganization } from "@/lib/sites/flag";

export async function assertSitesAccess(
  params: Parameters<typeof assertOrganizationAccess>[0]
): Promise<void> {
  await assertOrganizationAccess(params);
  const memo = params.headers ? getORPCRequestMemo(params.headers) : undefined;
  let enabled = memo?.sitesEnabledByOrganization.get(params.organizationId);
  if (!enabled) {
    enabled = isSitesEnabledForOrganization(params.organizationId);
    memo?.sitesEnabledByOrganization.set(params.organizationId, enabled);
  }
  if (!(await enabled)) {
    throw forbidden("Notra Sites is not enabled for this organization");
  }
}
