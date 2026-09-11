import { createHmac, timingSafeEqual } from "node:crypto";

import { RECOVERY_TOKEN_TTL_SECONDS } from "@/constants/security";
import type { RecoveryTokenPayload } from "@/types/auth/security";

const MS_PER_SECOND = 1000;
const TOKEN_PARTS = 2;

function secret(): string {
  const value = process.env.WORKOS_COOKIE_PASSWORD;
  if (!value) {
    throw new Error("WORKOS_COOKIE_PASSWORD must be defined");
  }
  return value;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

/**
 * Short-lived, HMAC-signed token handed to the login form together with an
 * MFA challenge so a backup code can be tied to the right user.
 */
export function createRecoveryToken(
  input: Pick<RecoveryTokenPayload, "workosUserId" | "email">
): string {
  const payload: RecoveryTokenPayload = {
    ...input,
    exp: Math.floor(Date.now() / MS_PER_SECOND) + RECOVERY_TOKEN_TTL_SECONDS,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

export function readRecoveryToken(token: string): RecoveryTokenPayload | null {
  const parts = token.split(".");
  if (parts.length !== TOKEN_PARTS) {
    return null;
  }
  const [encoded, signature] = parts;
  if (!(encoded && signature)) {
    return null;
  }
  const expected = sign(encoded);
  const given = Buffer.from(signature);
  const wanted = Buffer.from(expected);
  if (given.length !== wanted.length || !timingSafeEqual(given, wanted)) {
    return null;
  }
  try {
    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8")
    ) as Partial<RecoveryTokenPayload>;
    if (
      typeof payload.workosUserId !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.exp !== "number" ||
      payload.exp * MS_PER_SECOND < Date.now()
    ) {
      return null;
    }
    return {
      workosUserId: payload.workosUserId,
      email: payload.email,
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}
