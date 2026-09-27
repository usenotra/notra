const PROTOCOL_PREFIX_REGEX = /^https?:\/\//i;
const LEADING_WWW_REGEX = /^www\./;

export function normalizeSitemapUrl(value: string): string {
  const trimmed = value.trim();
  return PROTOCOL_PREFIX_REGEX.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function getHostname(value: string): string | null {
  try {
    const parsed = new URL(normalizeSitemapUrl(value));
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed.hostname.toLowerCase();
  } catch {
    return null;
  }
}

export function getRegistrableHost(value: string): string | null {
  const hostname = getHostname(value);
  return hostname ? hostname.replace(LEADING_WWW_REGEX, "") : null;
}

export function isUrlWithinBrandHost(
  inputUrl: string,
  brandWebsiteUrl: string | null
): boolean {
  if (!brandWebsiteUrl) {
    return false;
  }

  const brandHost = getRegistrableHost(brandWebsiteUrl);
  const inputHost = getRegistrableHost(inputUrl);

  if (!(brandHost && inputHost)) {
    return false;
  }

  return inputHost === brandHost || inputHost.endsWith(`.${brandHost}`);
}

export function getSafeHttpUrl(value: string): string | null {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}
