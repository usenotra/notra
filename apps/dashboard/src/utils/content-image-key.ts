import { CONTENT_IMAGE_ROUTE } from "@/constants/content-image";

const CONTENT_MEDIA_EXTENSION_SOURCE = "avif|gif|jpe?g|mp4|png|webm|webp";

const CONTENT_IMAGE_KEY_PATTERN = new RegExp(
  `^organization/[^/]+/content/[A-Za-z0-9_-]+\\.(?:${CONTENT_MEDIA_EXTENSION_SOURCE})$`
);

const CONTENT_MEDIA_EXTENSION_PATTERN = new RegExp(
  `\\.(?:${CONTENT_MEDIA_EXTENSION_SOURCE})$`,
  "i"
);

export function isSafeContentImageKey(key: string) {
  return (
    key.length <= 512 &&
    !key.includes("..") &&
    !key.includes("\\") &&
    CONTENT_IMAGE_KEY_PATTERN.test(key)
  );
}

export function contentImageKeyBelongsToOrganization(
  key: string,
  organizationId: string
) {
  return (
    isSafeContentImageKey(key) &&
    key.startsWith(`organization/${organizationId}/`)
  );
}

export function contentMediaExtension(key: string) {
  return CONTENT_MEDIA_EXTENSION_PATTERN.exec(key)?.[0].toLowerCase() ?? null;
}

function keyFromPathname(pathname: string) {
  if (!pathname.startsWith(`${CONTENT_IMAGE_ROUTE}/`)) {
    return null;
  }
  let key: string;
  try {
    key = decodeURIComponent(pathname.slice(CONTENT_IMAGE_ROUTE.length + 1));
  } catch {
    return null;
  }
  return isSafeContentImageKey(key) ? key : null;
}

function originAllowed(origin: string, appOrigin: string | null) {
  let parsed: URL;
  try {
    parsed = new URL(origin);
  } catch {
    return false;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return false;
  }
  if (appOrigin) {
    try {
      if (origin === new URL(appOrigin).origin) {
        return true;
      }
    } catch {
      // Ignore a malformed app origin and fall through to loopback.
    }
  }
  return parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
}

/**
 * Storage key for a dashboard-served content image. Relative URLs are ours.
 * Absolute URLs must be this app (or loopback) so a remote lookalike path is
 * not treated as a local file.
 */
export function getAppContentImageKey(
  imageUrl: string,
  appOrigin: string | null
) {
  if (imageUrl.startsWith(`${CONTENT_IMAGE_ROUTE}/`)) {
    const pathname = imageUrl.split(/[?#]/, 1)[0] ?? imageUrl;
    return keyFromPathname(pathname);
  }

  let url: URL;
  try {
    url = new URL(imageUrl);
  } catch {
    return null;
  }
  if (!originAllowed(url.origin, appOrigin)) {
    return null;
  }
  return keyFromPathname(url.pathname);
}

export function readAppOrigin() {
  const value =
    process.env.APP_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    null;
  if (!value) {
    return null;
  }
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}
