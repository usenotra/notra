import type {
  ReadSitePreviewToken,
  SitePreviewTokenClaims,
} from "@notra/sites-core/types/preview-token";
import { fromBase64Url, toBase64Url } from "@notra/sites-core/utils/base64url";

const encoder = new TextEncoder();

async function importKey(secret: string): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

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

export async function readSitePreviewToken(
  token: string,
  secret: string,
  nowSeconds: number = Math.floor(Date.now() / 1000)
): Promise<ReadSitePreviewToken | null> {
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
    if (typeof claims.exp !== "number" || typeof claims.siteId !== "string") {
      return null;
    }
    return { claims, expired: claims.exp <= nowSeconds };
  } catch {
    return null;
  }
}

export async function verifySitePreviewToken(
  token: string,
  secret: string,
  nowSeconds: number = Math.floor(Date.now() / 1000)
): Promise<SitePreviewTokenClaims | null> {
  const read = await readSitePreviewToken(token, secret, nowSeconds);
  return read && !read.expired ? read.claims : null;
}

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
