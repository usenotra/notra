import {
  OFFERING_CHECK_MAX_SOURCE_DOMAINS,
  OFFERING_CHECK_MAX_SOURCE_PAGES,
  OFFERING_TRACKING_PARAM,
} from "@/constants/offering-check";
import type {
  OfferingAnswer,
  OfferingSourceDomain,
  OfferingSourceSummary,
} from "@/types/offering-check";

import { domainOfUrl } from "./offering-domain";

function cleanSourceUrl(url: string): string {
  if (!URL.canParse(url)) {
    return url;
  }
  const parsed = new URL(url);
  parsed.searchParams.delete(OFFERING_TRACKING_PARAM);
  parsed.hash = "";
  return parsed.toString();
}

function isOwnDomain(candidate: string, domain: string): boolean {
  return candidate === domain || candidate.endsWith(`.${domain}`);
}

export function groupSourcesByDomain(
  domain: string,
  retrievedUrls: readonly string[],
  citedUrls: readonly string[]
): OfferingSourceDomain[] {
  const groups = new Map<string, Map<string, boolean>>();
  const add = (rawUrl: string, cited: boolean) => {
    const url = cleanSourceUrl(rawUrl);
    const urlHost = domainOfUrl(url);
    if (!urlHost) {
      return;
    }
    const host = isOwnDomain(urlHost, domain) ? domain : urlHost;
    const group = groups.get(host) ?? new Map<string, boolean>();
    group.set(url, (group.get(url) ?? false) || cited);
    groups.set(host, group);
  };
  for (const url of citedUrls) {
    add(url, true);
  }
  for (const url of retrievedUrls) {
    add(url, false);
  }

  return [...groups.entries()]
    .map(([host, group]) => {
      const urls = [...group.entries()]
        .map(([url, cited]) => ({ url, cited }))
        .sort((a, b) => Number(b.cited) - Number(a.cited));
      return {
        domain: host,
        pages: urls.length,
        urls: urls.slice(0, OFFERING_CHECK_MAX_SOURCE_PAGES),
        cited: urls.some((page) => page.cited),
        own: isOwnDomain(host, domain),
        topUrl: urls[0]?.url ?? `https://${host}`,
      };
    })
    .sort((a, b) => b.pages - a.pages || Number(b.cited) - Number(a.cited))
    .slice(0, OFFERING_CHECK_MAX_SOURCE_DOMAINS);
}

export function countSourcePages(
  sources: readonly OfferingSourceDomain[]
): number {
  return sources.reduce((total, source) => total + source.pages, 0);
}

/** Sites, pages and use of the own site across every answer of a check. */
export function summarizeOfferingSources(
  answers: readonly OfferingAnswer[]
): OfferingSourceSummary {
  const sites = new Set<string>();
  const pages = new Set<string>();
  let ownRead = false;
  let ownCited = false;
  for (const source of answers.flatMap((answer) => answer.sources)) {
    sites.add(source.domain);
    for (const page of source.urls) {
      pages.add(page.url);
    }
    ownRead = ownRead || source.own;
    ownCited = ownCited || (source.own && source.cited);
  }
  let ownSite = "Not opened";
  if (ownCited) {
    ownSite = "Cited";
  } else if (ownRead) {
    ownSite = "Read, not cited";
  }
  return { sites: sites.size, pages: pages.size, ownSite };
}
