import { timingSafeEqual } from "node:crypto";

import { RUNNER_SECRET_MIN_LENGTH } from "../constants/runner";

const BEARER_SCHEME = "bearer";

function matches(provided: string, expected: string): boolean {
  const left = Buffer.from(provided);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

export const isRunnerSecretConfigured = (secret: string | undefined) =>
  (secret?.trim().length ?? 0) >= RUNNER_SECRET_MIN_LENGTH;

/** Scheme is case-insensitive; the token itself is not. */
function bearerToken(authorization: string | undefined): string | null {
  if (!authorization) {
    return null;
  }
  const separator = authorization.indexOf(" ");
  if (separator <= 0) {
    return null;
  }
  if (authorization.slice(0, separator).toLowerCase() !== BEARER_SCHEME) {
    return null;
  }
  const token = authorization.slice(separator + 1).trim();
  return token.length > 0 ? token : null;
}

/** An unset or weak secret authorizes nothing, so deploys fail closed. */
export function isAuthorized(
  authorization: string | undefined,
  secret: string | undefined
): boolean {
  const expected = secret?.trim() ?? "";
  const token = bearerToken(authorization);
  if (expected.length < RUNNER_SECRET_MIN_LENGTH || token === null) {
    return false;
  }
  return matches(token, expected);
}
