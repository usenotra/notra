import type { CheckResponse } from "autumn-js";

import { autumn } from "./autumn";

const DUPLICATE_STATUS_CODES = new Set([409]);
const GONE_STATUS_CODES = new Set([404, 409, 410]);

function getErrorStatus(error: unknown): number | undefined {
  if (
    error &&
    typeof error === "object" &&
    "status" in error &&
    typeof error.status === "number"
  ) {
    return error.status;
  }
  if (
    error &&
    typeof error === "object" &&
    "statusCode" in error &&
    typeof error.statusCode === "number"
  ) {
    return error.statusCode;
  }
  return undefined;
}

export interface AutumnFeatureCheck {
  response: CheckResponse | null;
  /** The lock already exists, so an earlier attempt reserved this same run. */
  duplicateLock: boolean;
}

/**
 * Asks Autumn whether a feature has balance left and, with a lock id, holds
 * `requiredBalance` of it until the run finalizes. The lock id doubles as the
 * idempotency key, so a retry of the same run reserves nothing twice.
 */
export async function checkAutumnFeature(input: {
  organizationId: string;
  featureId: string;
  requiredBalance?: number;
  lockId: string | null;
  lockTtlMs: number;
}): Promise<AutumnFeatureCheck> {
  if (!autumn) {
    return { response: null, duplicateLock: false };
  }
  try {
    const response = await autumn.check(
      {
        customerId: input.organizationId,
        featureId: input.featureId,
        ...(input.requiredBalance === undefined
          ? {}
          : { requiredBalance: input.requiredBalance }),
        ...(input.lockId
          ? {
              lock: {
                lockId: input.lockId,
                enabled: true,
                expiresAt: Date.now() + input.lockTtlMs,
              },
            }
          : {}),
      },
      input.lockId
        ? {
            retries: { strategy: "none" },
            headers: { "Idempotency-Key": input.lockId },
          }
        : undefined
    );
    return { response, duplicateLock: false };
  } catch (error) {
    if (
      input.lockId &&
      DUPLICATE_STATUS_CODES.has(getErrorStatus(error) ?? 0)
    ) {
      return { response: null, duplicateLock: true };
    }
    throw new Error(`Autumn ${input.featureId} check failed: ${String(error)}`);
  }
}

/**
 * Settles a lock: `confirm` deducts `overrideValue` instead of what was held,
 * `release` gives it back. A lock that is already gone was settled before.
 */
export async function finalizeAutumnLock(
  lockId: string,
  action: "confirm" | "release",
  overrideValue?: number,
  properties?: Record<string, string | number | boolean>
): Promise<void> {
  if (!autumn) {
    return;
  }
  try {
    await autumn.balances.finalize(
      {
        lockId,
        action,
        ...(overrideValue === undefined ? {} : { overrideValue }),
        ...(properties ? { properties } : {}),
      },
      { headers: { "Idempotency-Key": `${lockId}:${action}` } }
    );
  } catch (error) {
    if (GONE_STATUS_CODES.has(getErrorStatus(error) ?? 0)) {
      return;
    }
    throw error;
  }
}
