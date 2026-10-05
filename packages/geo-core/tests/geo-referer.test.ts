import { expect, test } from "bun:test";

import { resolveAiReferrer } from "../src/ingest/classify-visitor";
import { buildGeoTrafficEvent } from "../src/ingest/event";
import { sanitizeGeoReferer } from "../src/utils/geo-referer";

test("stored referrers retain their origin and path without private URL components", () => {
  expect(
    sanitizeGeoReferer(
      "https://user:fixture@www.bing.com/chat?private=fixture#private-fragment"
    )
  ).toBe("https://www.bing.com/chat");
  expect(
    sanitizeGeoReferer("http://example.com:8080/path?q=fixture#fragment")
  ).toBe("http://example.com:8080/path");
  expect(sanitizeGeoReferer("https://bücher.de/path?private=fixture")).toBe(
    "https://xn--bcher-kva.de/path"
  );
});

test("missing, invalid, relative and non-HTTP referrers are not stored", () => {
  for (const value of [
    undefined,
    "",
    ":::",
    "/relative?private=fixture",
    "data:text/plain,fixture",
    ["javascript", "fixture"].join(":"),
    "file:///fixture",
  ]) {
    expect(sanitizeGeoReferer(value)).toBe("");
  }
});

test("source classification remains intact after referrer sanitization", () => {
  for (const value of [
    "https://chatgpt.com/?q=fixture",
    "https://www.bing.com/chat?q=fixture",
    "https://perplexity.ai/search?q=fixture",
  ]) {
    expect(resolveAiReferrer(sanitizeGeoReferer(value))).toBe(
      resolveAiReferrer(value)
    );
    expect(resolveAiReferrer(value)).not.toBeNull();
  }
});

test("event creation applies referrer sanitization at the storage boundary", () => {
  const event = buildGeoTrafficEvent({
    organizationId: "org-fixture",
    projectId: "project-fixture",
    payload: {
      method: "GET",
      url: "https://example.com/page",
      referer:
        "https://user:fixture@chatgpt.com/share?private=fixture#fragment",
    },
    url: new URL("https://example.com/page"),
    capturedAt: new Date("2026-10-05T12:00:00Z"),
    classification: {
      visitorType: "ai_referral",
      source: "chatgpt",
      agent: "",
      category: "assistant-referral",
      confidence: "reported",
    },
    journey: { journeyId: "", path: "/page" },
  });
  expect(event.referer).toBe("https://chatgpt.com/share");
  expect(event.source).toBe("chatgpt");
  expect(event.captured_at).toBe("2026-10-05 12:00:00");
});
