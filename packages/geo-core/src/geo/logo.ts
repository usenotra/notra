import { googleFaviconUrl } from "@notra/utils/google-favicon";

import { GEO_AVATAR_FALLBACK_BASE } from "../constants/geo";

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
  const fallback = `${GEO_AVATAR_FALLBACK_BASE}?seed=${encodeURIComponent(seed)}`;
  return [...competitorLogoSources(domain, logo), fallback];
}
