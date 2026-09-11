import type { OrganizationRow } from "@/types/organizations/actions";

/**
 * Drops the joined members so only the organization row crosses to the client.
 */
export function toOrganizationSummary(
  organization: OrganizationRow & { members: unknown }
): OrganizationRow {
  const { members: _members, ...summary } = organization;
  return summary;
}
