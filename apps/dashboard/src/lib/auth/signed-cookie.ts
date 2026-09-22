import { createHmac, timingSafeEqual } from "node:crypto";

import type * as z from "zod";

import {
  clearShortLivedCookie,
  clearShortLivedCookiesWithPrefix,
  readShortLivedCookie,
  storeShortLivedCookie,
} from "@/lib/auth/short-lived-cookie";

const SIGNATURE_SEPARATOR = ".";
const KEY_CONTEXT = "notra-signed-cookie";

/**
 * Cookies are httpOnly but still live in the browser, so anything the server
 * later trusts (a user id, a challenge id) must carry a signature the
 * browser cannot produce. The key is derived from the AuthKit cookie
 * password, which is already required to run the app.
 */
function getSigningKey(): Buffer {
  const password = process.env.WORKOS_COOKIE_PASSWORD;
  if (!password) {
    throw new Error("WORKOS_COOKIE_PASSWORD must be defined");
  }
  return createHmac("sha256", password).update(KEY_CONTEXT).digest();
}

function sign(encodedPayload: string): string {
  return createHmac("sha256", getSigningKey())
    .update(encodedPayload)
    .digest("base64url");
}

export async function storeSignedCookie(
  name: string,
  payload: unknown,
  maxAgeSeconds: number
) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  await storeShortLivedCookie(
    name,
    `${encoded}${SIGNATURE_SEPARATOR}${sign(encoded)}`,
    maxAgeSeconds
  );
}

/** Returns the payload only when the signature and the schema both hold. */
export async function readSignedCookie<T>(
  name: string,
  schema: z.ZodType<T>
): Promise<T | null> {
  const raw = await readShortLivedCookie(name);
  if (!raw) {
    return null;
  }
  const separatorIndex = raw.lastIndexOf(SIGNATURE_SEPARATOR);
  if (separatorIndex === -1) {
    return null;
  }
  const encoded = raw.slice(0, separatorIndex);
  const provided = Buffer.from(raw.slice(separatorIndex + 1), "base64url");
  const expected = Buffer.from(sign(encoded), "base64url");
  if (
    provided.length !== expected.length ||
    !timingSafeEqual(provided, expected)
  ) {
    return null;
  }
  try {
    const parsed = schema.safeParse(
      JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"))
    );
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function clearSignedCookie(name: string) {
  return clearShortLivedCookie(name);
}

export function clearSignedCookiesWithPrefix(prefix: string) {
  return clearShortLivedCookiesWithPrefix(prefix);
}
