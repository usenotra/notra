/**
 * Runs the membership check together with an independent feature gate.
 *
 * Both checks always run to completion so a batched request pays one round
 * trip instead of two. When both fail, the membership error wins: a
 * non-member must not learn anything about the organization's entitlements.
 */
export async function assertAccessInParallel(
  membershipCheck: Promise<unknown>,
  featureGate: Promise<unknown>
): Promise<void> {
  const [membership, gate] = await Promise.allSettled([
    membershipCheck,
    featureGate,
  ]);

  if (membership.status === "rejected") {
    throw membership.reason;
  }
  if (gate.status === "rejected") {
    throw gate.reason;
  }
}
