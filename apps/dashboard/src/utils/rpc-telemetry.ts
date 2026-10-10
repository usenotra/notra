import { getOpenRequestLogger } from "@notra/ai/utils/evlog-request";
import { getOperationalContext } from "@notra/ai/utils/operational-context";

import { getORPCRequestMemo } from "@/lib/orpc/context";
import type { ORPCRequestMemo } from "@/types/orpc/context";

/** Call only after validating membership, never from untrusted procedure input. */
export function recordAuthorizedOrganization(
  headers: Headers,
  organizationId: string,
  userId: string
): void {
  const memo = getORPCRequestMemo(headers);
  if (memo) {
    memo.authorizedOrganizationIds.add(organizationId);
    memo.authenticatedUserId = userId;
  }
  const context = getOperationalContext();
  if (context) {
    context.userId = userId;
    // A procedure that accesses multiple tenants has no single target.
    context.organizationId =
      context.organizationId === undefined ||
      context.organizationId === organizationId
        ? organizationId
        : null;
  }
}

export function rpcRequestOrganizationId(
  memo: ORPCRequestMemo | undefined
): string | undefined {
  return memo?.authorizedOrganizationIds.size === 1
    ? memo.authorizedOrganizationIds.values().next().value
    : undefined;
}

/** Override earlier procedure fields at the existing final emit, including undefined.
 * evlog's set() skips undefined/null, so it cannot clear stale attribution.
 */
export function finalizeRpcRequestAttribution(
  memo: ORPCRequestMemo | undefined
): void {
  const logger = getOpenRequestLogger();
  if (!logger) {
    return;
  }
  const emit = logger.emit.bind(logger);
  // Streaming batches can authorize more targets after the handler returns.
  logger.emit = (overrides) =>
    emit({
      ...overrides,
      organizationId: rpcRequestOrganizationId(memo),
      userId: memo?.authenticatedUserId,
    });
}
