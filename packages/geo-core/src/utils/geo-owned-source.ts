import { normalizeCompetitorDomain } from "../geo/domain";

function isSameDomainOrSubdomain(candidate: string, owned: string): boolean {
  return candidate === owned || candidate.endsWith(`.${owned}`);
}

function ownedDomains(
  websiteUrl: string | null | undefined,
  aliases: readonly string[]
): string[] {
  const values = [websiteUrl ?? "", ...aliases];
  return [
    ...new Set(
      values.flatMap((value) => {
        const domain = normalizeCompetitorDomain(value);
        return domain?.includes(".") ? [domain] : [];
      })
    ),
  ];
}

export function hasOwnedSourceCitation(
  websiteUrl: string | null | undefined,
  sources: readonly { url: string }[],
  aliases: readonly string[] = []
): boolean {
  const domains = ownedDomains(websiteUrl, aliases);
  if (domains.length === 0) {
    return false;
  }

  return sources.some((source) => {
    const sourceDomain = normalizeCompetitorDomain(source.url);
    return Boolean(
      sourceDomain &&
      domains.some((domain) => isSameDomainOrSubdomain(sourceDomain, domain))
    );
  });
}
