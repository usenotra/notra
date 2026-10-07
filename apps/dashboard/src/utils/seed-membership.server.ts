import { createORPCContext } from "@/lib/orpc/context";
import type { LoadedMembership } from "@/types/auth/organization";

/**
 * The page already loaded this membership. Seed it into the request memo so
 * each prefetched procedure does not repeat the same SELECT.
 */
export async function seedMembership(
  organizationId: string,
  requestHeaders: Headers,
  membership: LoadedMembership | undefined
) {
  if (!membership) {
    return;
  }
  const { requestMemo } = await createORPCContext({
    headers: requestHeaders,
  });
  requestMemo.membershipByUserOrganization.set(
    `${membership.userId}:${organizationId}`,
    Promise.resolve({ id: membership.id, role: membership.role })
  );
}
