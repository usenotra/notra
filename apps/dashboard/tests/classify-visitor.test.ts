import { describe, expect, test } from "bun:test";

import {
  classifyVisitor,
  resolveAiReferrer,
} from "../src/lib/geo-ingest/classify-visitor";

describe("resolveAiReferrer", () => {
  test("attributes meta.ai click-throughs as Meta", () => {
    expect(resolveAiReferrer("https://www.meta.ai/")).toBe("meta");
    expect(resolveAiReferrer("https://meta.ai/prompt")).toBe("meta");
  });

  test("does not treat every Instagram visit as AI traffic", () => {
    expect(resolveAiReferrer("https://www.instagram.com/")).toBeNull();
    expect(resolveAiReferrer("https://l.instagram.com/")).toBeNull();
  });
});

describe("classifyVisitor", () => {
  test("records meta.ai referrals as Meta, not Instagram", () => {
    const result = classifyVisitor({
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
      referer: "https://www.meta.ai/",
      accept: undefined,
    });
    expect(result.visitorType).toBe("ai_referral");
    expect(result.source).toBe("meta");
  });
});
