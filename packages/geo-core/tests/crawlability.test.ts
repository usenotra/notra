import { describe, expect, test } from "bun:test";

import type {
  CrawlabilityDocument,
  CrawlabilityFetch,
} from "../src/types/crawlability";
import {
  evaluateCrawlabilityPage,
  evaluateCrawlabilityRobots,
  googleIndexingDirectives,
} from "../src/utils/crawlability-evaluation";
import { scanCrawlability } from "../src/utils/crawlability-scan";

function document(body: string, header = ""): CrawlabilityDocument {
  return {
    url: "https://example.com/",
    status: 200,
    body,
    headers: new Headers({
      "content-type": "text/html",
      "x-robots-tag": header,
    }),
  };
}

describe("deterministic crawler diagnostics", () => {
  test("specific robots groups override wildcard, with longest-path allow", () => {
    const robots = {
      url: "https://example.com/robots.txt",
      status: 200,
      body: "User-agent: *\nDisallow: /\nUser-agent: OAI-SearchBot\nDisallow: /private\nAllow: /private/public$",
    };
    const checks = evaluateCrawlabilityRobots(
      "https://example.com/private/public",
      robots
    );
    expect(
      checks.find((check) => check.id === "robots-Googlebot")?.result
    ).toBe("blocked");
    expect(
      checks.find((check) => check.id === "robots-OAI-SearchBot")?.result
    ).toBe("passed");
    expect(
      evaluateCrawlabilityRobots(
        "https://example.com/private/public/extra",
        robots
      ).find((check) => check.id === "robots-OAI-SearchBot")?.result
    ).toBe("blocked");
  });

  test("missing robots is distinct from unavailable robots", () => {
    for (const status of [404, 410]) {
      expect(
        evaluateCrawlabilityRobots("https://example.com/", {
          url: "https://example.com/robots.txt",
          status,
          body: "Not found",
        }).every((check) => check.result === "passed")
      ).toBe(true);
    }
    for (const status of [429, 503, null]) {
      expect(
        evaluateCrawlabilityRobots("https://example.com/", {
          url: "https://example.com/robots.txt",
          status,
          body: null,
        }).every((check) => check.result === "unknown")
      ).toBe(true);
    }
  });

  test("bot-specific noindex does not leak across bots", () => {
    expect(
      googleIndexingDirectives("bingbot: noindex, nofollow", [])
    ).not.toContain("noindex");
    expect(
      googleIndexingDirectives("noindex, bingbot: nofollow", [])
    ).toContain("noindex");
    expect(
      googleIndexingDirectives("googlebot: noindex, nofollow", [])
    ).toContain("noindex");
    expect(
      googleIndexingDirectives("", [
        { name: "ROBOTS", content: "INDEX, NOINDEX" },
      ])
    ).toContain("noindex");
    expect(
      googleIndexingDirectives("", [{ name: "bingbot", content: "noindex" }])
    ).not.toContain("noindex");
  });

  test("healthy HTML passes while script-only shells require review", () => {
    const healthy = evaluateCrawlabilityPage(
      "https://example.com/",
      document(
        `<html><head><link rel='canonical' href='/'></head><body><main><h1>Article</h1>${"Useful public article. ".repeat(20)}</main></body></html>`
      )
    );
    expect(healthy.every((check) => check.result === "passed")).toBe(true);
    const shell = evaluateCrawlabilityPage(
      "https://example.com/",
      document(
        `<script>${"Fake text ".repeat(100)}</script><nav>${"Navigation ".repeat(100)}</nav><main></main>`
      )
    );
    expect(shell.find((check) => check.id === "content")?.result).toBe(
      "review"
    );
  });

  test("noindex is blocked, intentional canonical and redirects are review items", () => {
    const checks = evaluateCrawlabilityPage(
      "https://example.com/?ref=source",
      document(
        "<meta name='googlebot' content='none'><link rel='canonical' href='/other'>"
      )
    );
    expect(checks.find((check) => check.id === "indexing")?.result).toBe(
      "blocked"
    );
    expect(checks.find((check) => check.id === "canonical")?.result).toBe(
      "review"
    );
    expect(checks.find((check) => check.id === "redirect")?.result).toBe(
      "review"
    );
  });

  test("HTTP failures do not produce positive content or indexing verdicts", () => {
    const checks = evaluateCrawlabilityPage("https://example.com/", {
      ...document("Forbidden"),
      status: 403,
    });
    expect(checks).toHaveLength(1);
    expect(checks[0]?.result).toBe("blocked");
  });

  test("samples sitemap pages, deduplicates and restricts discovery to same origin", async () => {
    const requested: string[] = [];
    const request: CrawlabilityFetch = async (input, init, options) => {
      const url = String(input);
      requested.push(url);
      expect(init?.signal).toBeDefined();
      expect(options?.maxRedirects).toBe(5);
      if (url.endsWith("robots.txt")) {
        return new Response("User-agent: *\nAllow: /", { status: 200 });
      }
      if (url.endsWith("sitemap.xml")) {
        return new Response(
          `<urlset><url><loc>https://example.com/</loc></url><url><loc>https://other.com/</loc></url>${Array.from({ length: 30 }, (_, i) => `<url><loc>https://example.com/page-${i}</loc></url>`).join("")}</urlset>`
        );
      }
      return new Response(`<main>${"Useful content. ".repeat(30)}</main>`, {
        headers: { "content-type": "text/html" },
      });
    };
    const report = await scanCrawlability(
      "https://example.com/",
      undefined,
      request
    );
    expect(report.pages).toHaveLength(20);
    expect(new Set(report.pages.map((page) => page.url)).size).toBe(20);
    expect(requested.some((url) => url.includes("other.com"))).toBe(false);
    expect(requested.filter((url) => url.endsWith("robots.txt"))).toHaveLength(
      1
    );
  });

  test("an incomplete page fetch remains unknown and oversized bodies are not analyzed", async () => {
    const request: CrawlabilityFetch = async (input) =>
      String(input).endsWith("robots.txt")
        ? new Response("User-agent: *\nAllow: /")
        : new Response("x".repeat(2 * 1024 * 1024 + 1));
    const report = await scanCrawlability(
      "https://example.com/",
      undefined,
      request
    );
    expect(
      report.pages[0]?.checks.find((check) => check.id === "http")?.result
    ).toBe("unknown");
    expect(
      report.pages[0]?.checks.some((check) => check.id === "content")
    ).toBe(false);
    expect(report.discovery.join(" ")).toContain("unknown");
  });

  test("nested sitemaps respect a global fetch limit", async () => {
    const requested: string[] = [];
    const request: CrawlabilityFetch = async (input) => {
      const url = String(input);
      requested.push(url);
      if (url.endsWith("robots.txt")) {
        return new Response("User-agent: *\nAllow: /");
      }
      if (url.endsWith(".xml")) {
        return new Response(
          `<sitemapindex>${Array.from({ length: 10 }, (_, i) => `<sitemap><loc>https://example.com/${url.includes("sitemap.xml") ? "child" : "nested"}-${i}.xml</loc></sitemap>`).join("")}</sitemapindex>`
        );
      }
      return new Response("<main>Home</main>", {
        headers: { "content-type": "text/html" },
      });
    };
    await scanCrawlability("https://example.com/", undefined, request);
    expect(requested.filter((url) => url.endsWith(".xml"))).toHaveLength(3);
  });
});
