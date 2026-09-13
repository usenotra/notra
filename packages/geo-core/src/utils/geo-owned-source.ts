import { ingestAllowedHosts, matchesProjectHost } from "./geo-project-domains";

export function hasOwnedSourceCitation(
  websiteUrl: string | null | undefined,
  sources: readonly { url: string }[],
  extraDomains: readonly string[] = []
): boolean {
  const domains = ingestAllowedHosts(websiteUrl, extraDomains);
  if (domains.length === 0) {
    return false;
  }

  return sources.some((source) => matchesProjectHost(source.url, domains));
}
