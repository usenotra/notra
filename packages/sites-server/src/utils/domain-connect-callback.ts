import { createHmac, timingSafeEqual } from "node:crypto";

import {
  CALLBACK_TOKEN_LABEL,
  CALLBACK_TOKEN_SECONDS,
} from "../constants/domain-connect";
import { getSitesPreviewSecret } from "../env";
import type { DomainConnectCallbackClaims } from "../types/domain-connect";

function hmac(payload: string, label: string): Buffer {
  return createHmac("sha256", getSitesPreviewSecret())
    .update(`${label}${payload}`)
    .digest();
}

export function signDomainConnectCallback(
  claims: Omit<DomainConnectCallbackClaims, "exp">,
  nowSeconds: number = Math.floor(Date.now() / 1000),
  label: string = CALLBACK_TOKEN_LABEL
): string {
  const payload = Buffer.from(
    JSON.stringify({ ...claims, exp: nowSeconds + CALLBACK_TOKEN_SECONDS })
  ).toString("base64url");
  return `${payload}.${hmac(payload, label).toString("base64url")}`;
}

export function verifyDomainConnectCallback(
  token: string,
  nowSeconds: number = Math.floor(Date.now() / 1000),
  label: string = CALLBACK_TOKEN_LABEL
): DomainConnectCallbackClaims | null {
  const [payload, signature, extra] = token.split(".");
  if (!(payload && signature) || extra !== undefined) {
    return null;
  }
  const expected = hmac(payload, label);
  const given = Buffer.from(signature, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return null;
  }
  try {
    const claims = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    ) as Partial<DomainConnectCallbackClaims>;
    if (
      typeof claims.siteId !== "string" ||
      typeof claims.domainId !== "string" ||
      typeof claims.exp !== "number" ||
      claims.exp <= nowSeconds
    ) {
      return null;
    }
    return {
      siteId: claims.siteId,
      domainId: claims.domainId,
      exp: claims.exp,
    };
  } catch {
    return null;
  }
}
