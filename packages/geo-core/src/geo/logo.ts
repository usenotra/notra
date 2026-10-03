import {
  googleFaviconUrl,
  isReservedExampleDomain,
} from "@notra/utils/google-favicon";

import {
  GEO_AVATAR_FALLBACK_BASE,
  GEO_NOTRA_LOGO_PATH,
} from "../constants/geo";

export function competitorLogoSources(
  domain: string | null,
  logo: string | null
): string[] {
  const sources: string[] = [];
  if (logo) {
    sources.push(logo);
  }
  const favicon = googleFaviconUrl(domain);
  if (favicon) {
    sources.push(favicon);
  }
  return sources;
}

export function projectLogoSources(
  domain: string | null,
  seed: string,
  logo: string | null
): string[] {
  // Fictional demo brands have no favicon; show Notra's logo instead.
  const fallback = isReservedExampleDomain(domain)
    ? GEO_NOTRA_LOGO_PATH
    : `${GEO_AVATAR_FALLBACK_BASE}?seed=${encodeURIComponent(seed)}`;
  return [...competitorLogoSources(domain, logo), fallback];
}
