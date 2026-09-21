import { timingSafeEqual } from "node:crypto";

import { RUNNER_SECRET_MIN_LENGTH } from "../constants/runner";

const BEARER_PREFIX = "Bearer ";

function matches(provided: string, expected: string): boolean {
  const left = Buffer.from(provided);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

export const isRunnerSecretConfigured = (secret: string | undefined) =>
  (secret?.trim().length ?? 0) >= RUNNER_SECRET_MIN_LENGTH;

/** An unset or weak secret authorizes nothing, so deploys fail closed. */
export function isAuthorized(
  authorization: string | undefined,
  secret: string | undefined
): boolean {
  const expected = secret?.trim() ?? "";
  if (
    expected.length < RUNNER_SECRET_MIN_LENGTH ||
    !authorization?.startsWith(BEARER_PREFIX)
  ) {
    return false;
  }
  return matches(authorization.slice(BEARER_PREFIX.length).trim(), expected);
}
