import { describe, expect, test } from "bun:test";

import {
  classifyWebReferrer,
  describeUserAgent,
  webVisitorId,
} from "../src/ingest/web";
import type { WebPageViewInput } from "../src/types/ingest";
import { isHumanPageView } from "../src/utils/web-page-view";
import { CHROME } from "./constants/web-page-view";

function input(overrides: Partial<WebPageViewInput> = {}): WebPageViewInput {
  return {
    identity: { organizationId: "org", projectId: "prj", generation: 1 },
    payload: { method: "GET", url: "https://acme.com/blog", userAgent: CHROME },
    url: new URL("https://acme.com/blog"),
    capturedAt: new Date("2026-10-06T12:00:00Z"),
    classification: {
      visitorType: "human",
      source: "human",
      agent: "",
      category: "",
      confidence: "",
    },
    ...overrides,
  } as WebPageViewInput;
}

describe("isHumanPageView", () => {
  test("counts people and AI referrals, nothing else", () => {
    expect(isHumanPageView(input())).toBe(true);
    expect(
      isHumanPageView(
        input({
          classification: { ...input().classification, visitorType: "crawler" },
        })
      )
    ).toBe(false);
  });

  test("skips prefetches, redirects, non-AI bots and files for machines", () => {
    const base = input();
    expect(
      isHumanPageView({
        ...base,
        payload: {
          ...base.payload,
          signals: {
            clientHints: true,
            fetchMode: null,
            tracing: false,
            prefetch: true,
          },
        },
      })
    ).toBe(false);
    expect(
      isHumanPageView({ ...base, payload: { ...base.payload, status: 301 } })
    ).toBe(false);
    expect(
      isHumanPageView({ ...base, payload: { ...base.payload, status: 404 } })
    ).toBe(true);
    expect(
      isHumanPageView({
        ...base,
        payload: {
          ...base.payload,
          userAgent: "Mozilla/5.0 (compatible; Googlebot/2.1)",
        },
      })
    ).toBe(false);
    expect(
      isHumanPageView({
        ...base,
        url: new URL("https://acme.com/blog/post.md"),
      })
    ).toBe(false);
    expect(
      isHumanPageView({ ...base, url: new URL("https://acme.com/llms.txt") })
    ).toBe(false);
  });
});

describe("referrers", () => {
  test("groups search, social, internal, direct and AI", () => {
    expect(
      classifyWebReferrer("https://www.google.de/", "acme.com", null)
    ).toMatchObject({ group: "search", source: "google" });
    expect(
      classifyWebReferrer("https://t.co/abc", "acme.com", null)
    ).toMatchObject({ group: "social", source: "x" });
    expect(
      classifyWebReferrer("https://www.acme.com/pricing", "acme.com", null)
    ).toMatchObject({ group: "internal" });
    expect(classifyWebReferrer(undefined, "acme.com", null)).toMatchObject({
      group: "direct",
    });
    expect(
      classifyWebReferrer("https://example.org/", "acme.com", null)
    ).toMatchObject({ group: "other", source: "example.org" });
    expect(
      classifyWebReferrer("https://chatgpt.com/", "acme.com", "chatgpt")
    ).toMatchObject({ group: "ai", source: "chatgpt", aiProduct: "openai" });
  });
});

describe("visitor id", () => {
  test("stable within a day, different the next day and per site", () => {
    const day = new Date("2026-10-06T08:00:00Z");
    const later = new Date("2026-10-06T22:00:00Z");
    const next = new Date("2026-10-07T08:00:00Z");
    const id = webVisitorId("site_a", "1.2.3.4", CHROME, day);
    expect(id).toHaveLength(16);
    expect(webVisitorId("site_a", "1.2.3.4", CHROME, later)).toBe(id);
    expect(webVisitorId("site_a", "1.2.3.4", CHROME, next)).not.toBe(id);
    expect(webVisitorId("site_b", "1.2.3.4", CHROME, day)).not.toBe(id);
  });
});

test("user agents become coarse classes", () => {
  expect(describeUserAgent(CHROME)).toEqual({
    device: "desktop",
    browser: "Chrome",
    os: "macOS",
  });
  expect(
    describeUserAgent(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1"
    )
  ).toEqual({ device: "mobile", browser: "Safari", os: "iOS" });
});
