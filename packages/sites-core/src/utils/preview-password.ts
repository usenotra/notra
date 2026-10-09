import {
  SITE_PREVIEW_PASSWORD_ALGORITHM,
  SITE_PREVIEW_PASSWORD_HASH_BYTES,
  SITE_PREVIEW_PASSWORD_ITERATIONS,
  SITE_PREVIEW_PASSWORD_MAX_LENGTH,
  SITE_PREVIEW_PASSWORD_SALT_BYTES,
} from "@notra/sites-core/constants/sites";
import type { SitePreviewPassword } from "@notra/sites-core/types/deployment";
import { fromBase64Url, toBase64Url } from "@notra/sites-core/utils/base64url";

const encoder = new TextEncoder();

async function derivePasswordBits(
  password: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password.normalize("NFC")),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  return new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "PBKDF2", hash: "SHA-256", salt, iterations },
      key,
      SITE_PREVIEW_PASSWORD_HASH_BYTES * 8
    )
  );
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  let difference = a.length ^ b.length;
  for (let index = 0; index < a.length; index += 1) {
    difference |= (a[index] ?? 0) ^ (b[index % b.length] ?? 0);
  }
  return difference === 0;
}

export async function hashPreviewPassword(
  password: string,
  now: Date = new Date()
): Promise<SitePreviewPassword> {
  const salt = crypto.getRandomValues(
    new Uint8Array(new ArrayBuffer(SITE_PREVIEW_PASSWORD_SALT_BYTES))
  );
  const hash = await derivePasswordBits(
    password,
    salt,
    SITE_PREVIEW_PASSWORD_ITERATIONS
  );
  return {
    algorithm: SITE_PREVIEW_PASSWORD_ALGORITHM,
    iterations: SITE_PREVIEW_PASSWORD_ITERATIONS,
    salt: toBase64Url(salt),
    hash: toBase64Url(hash),
    version: toBase64Url(crypto.getRandomValues(new Uint8Array(12))),
    updatedAt: now.toISOString(),
  };
}

export async function verifyPreviewPassword(
  password: string,
  stored: SitePreviewPassword
): Promise<boolean> {
  if (
    password.length === 0 ||
    password.length > SITE_PREVIEW_PASSWORD_MAX_LENGTH ||
    stored.iterations > SITE_PREVIEW_PASSWORD_ITERATIONS
  ) {
    return false;
  }
  try {
    const expected = fromBase64Url(stored.hash);
    const actual = await derivePasswordBits(
      password,
      fromBase64Url(stored.salt),
      stored.iterations
    );
    return constantTimeEqual(actual, expected);
  } catch {
    return false;
  }
}
