import { googleFaviconUrl } from "@notra/utils/google-favicon";

export function competitorLogoSources(domain: string | null): string[] {
  const favicon = googleFaviconUrl(domain);
  return favicon ? [favicon] : [];
}
