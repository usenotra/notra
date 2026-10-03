import type { PerplexitySearchSource } from "@notra/ui/components/ai-skins/perplexity/perplexity-search";

const MARKDOWN_LINK = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
const BARE_URL = /\bhttps?:\/\/[^\s)]+/g;
const WWW_PREFIX = /^www\./;

function sourceDomain(href: string): string | null {
  try {
    const parsed = new URL(href);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed.hostname.replace(WWW_PREFIX, "");
  } catch {
    return null;
  }
}

export function perplexitySourcesFromExcerpt(
  excerpt: string
): PerplexitySearchSource[] {
  const seen = new Set<string>();
  const sources: PerplexitySearchSource[] = [];

  for (const match of excerpt.matchAll(MARKDOWN_LINK)) {
    const href = match[2] ?? "";
    const domain = sourceDomain(href);
    if (!domain || seen.has(domain)) {
      continue;
    }
    seen.add(domain);
    const title = match[1]?.trim() || domain;
    sources.push({ title, domain, url: href, verified: true });
  }

  for (const match of excerpt.matchAll(BARE_URL)) {
    const href = match[0] ?? "";
    const domain = sourceDomain(href);
    if (!domain || seen.has(domain)) {
      continue;
    }
    seen.add(domain);
    sources.push({ title: domain, domain, url: href, verified: true });
  }

  return sources;
}
