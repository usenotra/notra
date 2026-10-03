import type { SitePreviewTokenClaims } from "@notra/sites-core/types/preview-token";

const encoder = new TextEncoder();

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

async function importKey(secret: string): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

/**
 * Signed preview access token: `base64url(claims).base64url(hmac)`.
 * The dashboard mints it for members and share links; the sites worker only verifies.
 */
export async function signSitePreviewToken(
  claims: SitePreviewTokenClaims,
  secret: string
): Promise<string> {
  const payload = toBase64Url(encoder.encode(JSON.stringify(claims)));
  const key = await importKey(secret);
  const signature = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, encoder.encode(payload))
  );
  return `${payload}.${toBase64Url(signature)}`;
}

export async function verifySitePreviewToken(
  token: string,
  secret: string,
  nowSeconds: number = Math.floor(Date.now() / 1000)
): Promise<SitePreviewTokenClaims | null> {
  const [payload, signature, extra] = token.split(".");
  if (!(payload && signature) || extra !== undefined) {
    return null;
  }
  try {
    const key = await importKey(secret);
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      fromBase64Url(signature),
      encoder.encode(payload)
    );
    if (!valid) {
      return null;
    }
    const claims = JSON.parse(
      new TextDecoder().decode(fromBase64Url(payload))
    ) as SitePreviewTokenClaims;
    if (typeof claims.exp !== "number" || claims.exp <= nowSeconds) {
      return null;
    }
    if (typeof claims.siteId !== "string") {
      return null;
    }
    return claims;
  } catch {
    return null;
  }
}

/** A token is scoped to one site and optionally one preview; `previewKey: null` unlocks all previews of the site. */
export function previewTokenAllows(
  claims: SitePreviewTokenClaims,
  siteId: string,
  previewKey: string
): boolean {
  return (
    claims.siteId === siteId &&
    (claims.previewKey === null || claims.previewKey === previewKey)
  );
}
