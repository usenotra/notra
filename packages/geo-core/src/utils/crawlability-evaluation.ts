import type {
  CrawlabilityCheck,
  CrawlabilityResult,
} from "@notra/db/types/crawlability";
import { parse } from "node-html-parser";
import robotsParser from "robots-parser";

import { CRAWLABILITY_CRAWLERS } from "../constants/crawlability";
import type {
  CrawlabilityDocument,
  CrawlabilityMetaTag,
  CrawlabilityRobots,
} from "../types/crawlability";

export function evaluateCrawlabilityRobots(
  url: string,
  robots: CrawlabilityRobots
): CrawlabilityCheck[] {
  const unavailable =
    robots.body === null ||
    (robots.status === 200 &&
      /<(?:!doctype\s+html|html)(?:\s|>)/i.test(robots.body ?? "")) ||
    robots.status === 429 ||
    (robots.status ?? 0) >= 500;
  const missing =
    robots.status !== null &&
    robots.status >= 400 &&
    robots.status < 500 &&
    robots.status !== 429;
  const parser = robotsParser(robots.url, missing ? "" : (robots.body ?? ""));
  return CRAWLABILITY_CRAWLERS.map(({ agent, purpose }) => {
    const allowed = unavailable ? undefined : parser.isAllowed(url, agent);
    let result: CrawlabilityResult = "unknown";
    let recommendation: string | null =
      "Retry and inspect the robots endpoint and CDN response. A failed robots fetch is not a passing permission check.";
    if (allowed === true) {
      result = "passed";
      recommendation = null;
    }
    if (allowed === false) {
      result = "blocked";
      recommendation =
        "If this public page should be available to this crawler, adjust its matching robots rule. Keep intentional exclusions for private pages or training crawlers.";
    }
    return {
      id: `robots-${agent}`,
      name: `${agent} (${purpose})`,
      result,
      evidence:
        allowed === undefined
          ? `Could not establish robots permission from ${robots.url} (HTTP ${robots.status ?? "unavailable"}).`
          : `${url}: ${allowed ? "allowed" : "disallowed"} by ${robots.url}${missing ? " (no rules returned)" : `; matched rule line ${parser.getMatchingLineNumber(url, agent) ?? "none"}`}. This checks published rules, not the crawler's network access.`,
      recommendation,
    };
  });
}

/** X-Robots-Tag fields may have a bot scope that persists through comma-separated directives. */
export function googleIndexingDirectives(
  header: string,
  meta: CrawlabilityMetaTag[]
): string[] {
  let scope = "";
  const directives: string[] = [];
  for (const token of header.toLowerCase().split(",")) {
    const scoped = /^\s*([\w-]+)\s*:\s*(.*)$/.exec(token);
    if (
      scoped &&
      ![
        "max-snippet",
        "max-image-preview",
        "max-video-preview",
        "unavailable_after",
      ].includes(scoped[1] ?? "")
    ) {
      scope = scoped[1] ?? "";
    }
    const value = scoped ? (scoped[2] ?? "") : token;
    if (!scope || scope === "googlebot") {
      directives.push(...value.trim().split(/\s+/));
    }
  }
  for (const tag of meta) {
    if (["robots", "googlebot"].includes(tag.name.toLowerCase())) {
      directives.push(...tag.content.toLowerCase().split(/[\s,]+/));
    }
  }
  return directives;
}

export function evaluateCrawlabilityPage(
  requestedUrl: string,
  document: CrawlabilityDocument
): CrawlabilityCheck[] {
  const checks: CrawlabilityCheck[] = [];
  const ok = document.status >= 200 && document.status < 300;
  checks.push({
    id: "http",
    name: "Public HTTP access",
    result: ok ? "passed" : "blocked",
    evidence: `GET ${requestedUrl} returned HTTP ${document.status} at ${document.url}.`,
    recommendation: ok
      ? null
      : "For a public page, resolve the HTTP error or authentication/challenge response. Check CDN logs before changing bot rules; retain protection for private routes.",
  });
  if (!ok) {
    return checks;
  }
  if (new URL(requestedUrl).href !== new URL(document.url).href) {
    checks.push({
      id: "redirect",
      name: "Redirected URL",
      result: "review",
      evidence: `${requestedUrl} resolves to ${document.url}.`,
      recommendation:
        "If intentional, keep the redirect and link to the final canonical URL in internal links and sitemaps. Redirect sources do not need separate index entries.",
    });
  }
  const html = /^(text\/html|application\/xhtml\+xml)(;|$)/i.test(
    document.headers.get("content-type") ?? ""
  );
  const root = parse(html ? document.body : "");
  const meta = root.querySelectorAll("meta").map((tag) => ({
    name: tag.getAttribute("name") ?? "",
    content: tag.getAttribute("content") ?? "",
  }));
  const directives = googleIndexingDirectives(
    document.headers.get("x-robots-tag") ?? "",
    meta
  );
  const noindex = directives.some(
    (value) => value === "noindex" || value === "none"
  );
  checks.push({
    id: "indexing",
    name: "Google indexing directives",
    result: noindex ? "blocked" : "passed",
    evidence: noindex
      ? "The response contains a Google-applicable noindex/none directive."
      : "No Google-applicable noindex directive found in response headers or HTML meta tags. This does not prove Google indexing or AI citation.",
    recommendation: noindex
      ? "Remove noindex only if this page is intended for search. Keep it on private, login, and intentionally excluded pages. Crawlers must be allowed to fetch a page to read noindex."
      : null,
  });
  if (!html) {
    checks.push({
      id: "content",
      name: "Readable page content",
      result: "review",
      evidence: `Content-Type is ${document.headers.get("content-type") ?? "missing"}; HTML content checks were skipped.`,
      recommendation:
        "Serve HTML for public landing pages. JSON, PDFs, and other intentional resources do not need conversion solely to pass this check.",
    });
    return checks;
  }
  const baseHref = root.querySelector("base[href]")?.getAttribute("href");
  let base = document.url;
  try {
    if (baseHref) {
      base = new URL(baseHref, document.url).href;
    }
  } catch {
    /* Invalid base has no usable target. */
  }
  const canonicals = root
    .querySelectorAll("link[href]")
    .filter((link) =>
      (link.getAttribute("rel") ?? "")
        .toLowerCase()
        .split(/\s+/)
        .includes("canonical")
    )
    .map((link) => {
      try {
        return new URL(link.getAttribute("href") ?? "", base).href;
      } catch {
        return "invalid URL";
      }
    });
  if (canonicals.length > 0) {
    checks.push({
      id: "canonical",
      name: "Declared canonical",
      result:
        canonicals.length === 1 && canonicals[0] === document.url
          ? "passed"
          : "review",
      evidence: `HTML canonical: ${canonicals.join(", ")}.`,
      recommendation:
        canonicals.length === 1 && canonicals[0] === document.url
          ? null
          : "Check that the canonical intentionally identifies the preferred public page. An alternate canonical can be correct; do not change it to force duplicate URLs into the index.",
    });
  }
  const h1Count = root.querySelectorAll("h1").length;
  if (h1Count !== 1) {
    checks.push({
      id: "heading",
      name: "Main page heading",
      result: "review",
      evidence: `Found ${h1Count} H1 elements in the source HTML. This is a semantic check, not an indexing requirement.`,
      recommendation:
        "Use one clear main heading when appropriate. Check whether repeated headings are decorative or responsive duplicates; do not treat this alone as the cause of non-indexing.",
    });
  }
  root
    .querySelectorAll(
      "script,style,noscript,template,nav,header,footer,[hidden],[aria-hidden=true]"
    )
    .forEach((node) => node.remove());
  const text = (
    root.querySelector("main") ??
    root.querySelector("body") ??
    root
  ).textContent
    .replace(/\s+/g, " ")
    .trim();
  checks.push({
    id: "content",
    name: "Text available without JavaScript",
    result: text.length >= 200 ? "passed" : "review",
    evidence: `${text.length} text characters found after excluding scripts, navigation and explicitly hidden content. This is a raw HTML heuristic, not a rendered-browser or content-quality verdict.`,
    recommendation:
      text.length >= 200
        ? null
        : "Check for a JavaScript-only shell, login wall, or challenge page. If public content requires JavaScript, server-render the useful page text. Short pages may be intentional.",
  });
  return checks;
}
