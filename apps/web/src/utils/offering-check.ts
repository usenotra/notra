import {
  OFFERING_CHECK_MAX_SOURCE_DOMAINS,
  OFFERING_CHECK_MAX_SOURCE_PAGES,
} from "@/constants/offering-check";
import type {
  OfferingCheckInput,
  OfferingModeResult,
  OfferingOverall,
  OfferingSourceDomain,
} from "@/types/offering-check";

const PROTOCOL_PATTERN = /^[a-z][a-z0-9+.-]*:\/\//i;
const WWW_PATTERN = /^www\./;
const HOSTNAME_PATTERN =
  /^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/;
const MARKDOWN_CITATION_PATTERN = /\s*\(\[[^\]]+\]\([^)]+\)\)/g;
const TRACKING_PARAM = "utm_source";

export function normalizeDomain(input: string): string | null {
  const trimmed = input.trim().toLowerCase();
  if (trimmed.length === 0) {
    return null;
  }
  const withProtocol = PROTOCOL_PATTERN.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  if (!URL.canParse(withProtocol)) {
    return null;
  }
  const hostname = new URL(withProtocol).hostname.replace(WWW_PATTERN, "");
  return HOSTNAME_PATTERN.test(hostname) ? hostname : null;
}

function normalizeOfferingCheckText(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, " ");
}

export function getOfferingCheckBrandFeatureIdentity(
  input: OfferingCheckInput
): string {
  return JSON.stringify([
    input.domain.toLowerCase(),
    normalizeOfferingCheckText(input.feature),
  ]);
}

export function getOfferingCheckCacheIdentity(
  input: OfferingCheckInput
): string {
  return JSON.stringify([
    input.domain.toLowerCase(),
    normalizeOfferingCheckText(input.feature),
    normalizeOfferingCheckText(input.description),
  ]);
}

export function domainOfUrl(url: string): string | null {
  if (!URL.canParse(url)) {
    return null;
  }
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return null;
  }
  return parsed.hostname.toLowerCase().replace(WWW_PATTERN, "");
}

function cleanSourceUrl(url: string): string {
  if (!URL.canParse(url)) {
    return url;
  }
  const parsed = new URL(url);
  parsed.searchParams.delete(TRACKING_PARAM);
  parsed.hash = "";
  return parsed.toString();
}

function isOwnDomain(candidate: string, domain: string): boolean {
  return candidate === domain || candidate.endsWith(`.${domain}`);
}

export function stripAnswerCitations(text: string): string {
  return text.replace(MARKDOWN_CITATION_PATTERN, "").trim();
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

export function resolveOverall(
  memory: Pick<OfferingModeResult, "verdict">,
  search: Pick<OfferingModeResult, "verdict">
): OfferingOverall {
  if (search.verdict === "knows") {
    return memory.verdict === "knows" ? "known" : "search-only";
  }
  if (memory.verdict === "knows") {
    return "known";
  }
  if (search.verdict === "confused" || memory.verdict === "confused") {
    return "confused";
  }
  if (search.verdict === "vague" || memory.verdict === "vague") {
    return "vague";
  }
  return "unknown";
}

export function buildOfferingQuestion(input: OfferingCheckInput): string {
  if (input.feature.length === 0) {
    return `What does ${input.domain} offer? List its main products and features and say briefly what each one does.`;
  }
  const feature = input.feature.replaceAll('"', "");
  return `Does ${input.domain} offer a feature called "${feature}"? What does it do? If you do not know it, tell me what they offer instead.`;
}

const REGEX_SPECIAL_PATTERN = /[.*+?^${}()|[\]\\]/g;

export const OFFERING_MENTION_HREF = "#mention";

export function markFeatureMentions(text: string, feature: string): string {
  const needle = feature.replaceAll('"', "").trim();
  if (needle.length === 0) {
    return text;
  }
  const pattern = new RegExp(
    needle.replace(REGEX_SPECIAL_PATTERN, "\\$&"),
    "gi"
  );
  return text.replace(
    pattern,
    (match) => `[${match}](${OFFERING_MENTION_HREF})`
  );
}
