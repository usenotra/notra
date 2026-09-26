import { fetchPublicUrl } from "@notra/ai/utils/public-fetch";
import type {
  CrawlabilityPage,
  CrawlabilityReport,
} from "@notra/db/types/crawlability";
import { parse } from "node-html-parser";

import { AGENT_READINESS_USER_AGENT } from "../constants/agent-readiness";
import {
  CRAWLABILITY_DISCOVERY_LIMIT,
  CRAWLABILITY_MAX_BYTES,
  CRAWLABILITY_PAGE_LIMIT,
  CRAWLABILITY_SCAN_TIMEOUT_MS,
  CRAWLABILITY_SITEMAP_LIMIT,
  CRAWLABILITY_TIMEOUT_MS,
} from "../constants/crawlability";
import type {
  CrawlabilityDocument,
  CrawlabilityFetch,
  CrawlabilityRobots,
} from "../types/crawlability";
import {
  evaluateCrawlabilityPage,
  evaluateCrawlabilityRobots,
} from "./crawlability-evaluation";

async function readDocument(
  url: string,
  signal: AbortSignal,
  request: CrawlabilityFetch
): Promise<CrawlabilityDocument> {
  const response = await request(
    url,
    {
      signal: AbortSignal.any([
        signal,
        AbortSignal.timeout(CRAWLABILITY_TIMEOUT_MS),
      ]),
      headers: {
        "User-Agent": AGENT_READINESS_USER_AGENT,
        Accept: "text/html,application/xml,text/plain;q=0.9",
      },
    },
    { maxRedirects: 5, timeoutMs: CRAWLABILITY_TIMEOUT_MS }
  );
  const reader = response.body?.getReader();
  let body = "";
  let bytes = 0;
  const decoder = new TextDecoder();
  try {
    if (reader) {
      for (;;) {
        const chunk = await reader.read();
        if (chunk.done) {
          break;
        }
        bytes += chunk.value.byteLength;
        if (bytes > CRAWLABILITY_MAX_BYTES) {
          throw new Error("Response exceeded scan size limit");
        }
        body += decoder.decode(chunk.value, { stream: true });
      }
    }
    body += decoder.decode();
  } finally {
    await reader?.cancel().catch(() => undefined);
    reader?.releaseLock();
  }
  return {
    url: response.url || url,
    status: response.status,
    headers: response.headers,
    body,
  };
}

export async function scanCrawlability(
  targetUrl: string,
  signal?: AbortSignal,
  request: CrawlabilityFetch = fetchPublicUrl
): Promise<CrawlabilityReport> {
  const scanSignal = AbortSignal.any([
    ...(signal ? [signal] : []),
    AbortSignal.timeout(CRAWLABILITY_SCAN_TIMEOUT_MS),
  ]);
  const report: CrawlabilityReport = {
    checkedAt: new Date().toISOString(),
    pageLimit: CRAWLABILITY_PAGE_LIMIT,
    pages: [],
    discovery: [],
  };
  const robotsCache = new Map<string, Promise<CrawlabilityRobots>>();
  const robotsFor = (url: string): Promise<CrawlabilityRobots> => {
    const robotsUrl = new URL("/robots.txt", url).href;
    const cached = robotsCache.get(robotsUrl);
    if (cached) {
      return cached;
    }
    const result = readDocument(robotsUrl, scanSignal, request)
      .then((doc) => ({ url: robotsUrl, status: doc.status, body: doc.body }))
      .catch(() => ({ url: robotsUrl, status: null, body: null }));
    robotsCache.set(robotsUrl, result);
    return result;
  };
  const checkPage = async (url: string): Promise<CrawlabilityPage> => {
    const initialRobots = await robotsFor(url);
    const checks = evaluateCrawlabilityRobots(url, initialRobots);
    try {
      const doc = await readDocument(url, scanSignal, request);
      if (doc.url !== url) {
        const finalChecks = evaluateCrawlabilityRobots(
          doc.url,
          await robotsFor(doc.url)
        );
        for (const check of finalChecks) {
          checks.push({
            ...check,
            id: `final-${check.id}`,
            name: `Destination: ${check.name}`,
          });
        }
      }
      return {
        url,
        finalUrl: doc.url,
        status: doc.status,
        checks: [...checks, ...evaluateCrawlabilityPage(url, doc)],
      };
    } catch {
      return {
        url,
        finalUrl: null,
        status: null,
        checks: [
          ...checks,
          {
            id: "http",
            name: "Public HTTP access",
            result: "unknown",
            evidence:
              "The public fetch could not complete within the network, redirect, or response-size limits. No page-content verdict is available.",
            recommendation:
              "Retry, then check DNS, TLS, redirect loops and CDN logs. Notra's network result is not proof that a verified crawler is blocked.",
          },
        ],
      };
    }
  };
  const first = await checkPage(new URL(targetUrl).href);
  report.pages.push(first);
  const origin = new URL(first.finalUrl ?? targetUrl).origin;
  const robots = await robotsFor(origin);
  const declared = [
    ...(robots.body ?? "").matchAll(/^\s*sitemap:\s*(\S+)/gim),
  ].map((match) => match[1] ?? "");
  const queue = declared.length
    ? declared.slice(0, CRAWLABILITY_SITEMAP_LIMIT)
    : [new URL("/sitemap.xml", origin).href];
  const visited = new Set<string>();
  const pages = new Set<string>([first.url, first.finalUrl ?? first.url]);
  const selected: string[] = [];
  while (
    queue.length &&
    visited.size < CRAWLABILITY_SITEMAP_LIMIT &&
    selected.length < CRAWLABILITY_PAGE_LIMIT - 1 &&
    !scanSignal.aborted
  ) {
    const candidate = queue.shift();
    if (!candidate) {
      break;
    }
    let sitemapUrl: URL;
    try {
      sitemapUrl = new URL(candidate);
    } catch {
      report.discovery.push("Skipped an invalid sitemap URL.");
      continue;
    }
    if (sitemapUrl.origin !== origin) {
      report.discovery.push(`Skipped off-origin sitemap ${sitemapUrl.href}.`);
      continue;
    }
    if (visited.has(sitemapUrl.href)) {
      continue;
    }
    visited.add(sitemapUrl.href);
    try {
      const doc = await readDocument(sitemapUrl.href, scanSignal, request);
      const xml = parse(doc.body);
      const index = xml.querySelector("sitemapindex");
      const urlset = xml.querySelector("urlset");
      if (doc.status !== 200 || !(index || urlset)) {
        report.discovery.push(
          `${sitemapUrl.href}: HTTP ${doc.status}; no supported XML sitemap found.`
        );
        continue;
      }
      const locations = (index ?? urlset)?.querySelectorAll("loc") ?? [];
      report.discovery.push(
        `${sitemapUrl.href}: read ${locations.length} ${index ? "child sitemap" : "page"} entries.`
      );
      for (const loc of locations) {
        let url: URL;
        try {
          url = new URL(loc.textContent.trim());
        } catch {
          continue;
        }
        if (url.origin !== origin || url.username || url.password) {
          continue;
        }
        url.hash = "";
        if (index) {
          if (queue.length < CRAWLABILITY_SITEMAP_LIMIT) {
            queue.push(url.href);
          }
        } else if (!pages.has(url.href)) {
          pages.add(url.href);
          if (selected.length < CRAWLABILITY_DISCOVERY_LIMIT) {
            selected.push(url.href);
          }
        }
      }
    } catch {
      report.discovery.push(
        `${sitemapUrl.href}: fetch incomplete; sitemap coverage is unknown.`
      );
    }
  }
  // Include top-level product/company pages even when articles are listed first.
  selected.sort(
    (left, right) =>
      new URL(left).pathname.split("/").length -
        new URL(right).pathname.split("/").length || left.localeCompare(right)
  );
  selected.splice(CRAWLABILITY_PAGE_LIMIT - 1);
  for (let offset = 0; offset < selected.length; offset += 3) {
    const checked = await Promise.all(
      selected.slice(offset, offset + 3).map(checkPage)
    );
    report.pages.push(...checked);
  }
  report.discovery.push(
    `Sampled ${report.pages.length} URLs, limited to ${CRAWLABILITY_PAGE_LIMIT} pages and ${CRAWLABILITY_SITEMAP_LIMIT} sitemap files on ${origin}. Top-level paths are prioritized. Unlisted pages and skipped sitemap entries were not checked.`
  );
  return report;
}
