import { describe, expect, test } from "bun:test";

import {
  getSearchQuery,
  getSearchSources,
  getSearchStackLabel,
  isPublicSearchDomain,
} from "./chat-search-activity";

describe("chat-search-activity", () => {
  test("reads the query from search input", () => {
    expect(getSearchQuery({ query: " GDPR voice STT " })).toBe(
      "GDPR voice STT"
    );
    expect(getSearchQuery({})).toBeUndefined();
  });

  test("collects unique sources from results and nested web data", () => {
    expect(
      getSearchSources({
        results: [
          {
            url: "https://www.gladia.io/blog/latency",
            title: "How to measure latency",
          },
          {
            url: "https://www.gladia.io/blog/latency",
            title: "Duplicate",
          },
        ],
      })
    ).toEqual([
      {
        url: "https://www.gladia.io/blog/latency",
        title: "How to measure latency",
        domain: "gladia.io",
      },
    ]);

    expect(getSearchSources({ query: "x", results: [] })).toEqual([]);
    expect(
      getSearchSources({
        results: [
          {
            url: ["javascript", "alert(1)"].join(":"),
            title: "Ignore this",
          },
          {
            url: "data:text/html,oops",
            title: "Ignore this too",
          },
          {
            url: "https://futureagi.com/guide",
            title: "Voice latency",
          },
        ],
      })
    ).toEqual([
      {
        url: "https://futureagi.com/guide",
        title: "Voice latency",
        domain: "futureagi.com",
      },
    ]);

    expect(
      getSearchSources({
        data: {
          web: [{ url: "https://futureagi.com/guide", title: "Voice latency" }],
        },
      })
    ).toEqual([
      {
        url: "https://futureagi.com/guide",
        title: "Voice latency",
        domain: "futureagi.com",
      },
    ]);
  });

  test("labels stacked searches by count and streaming state", () => {
    expect(getSearchStackLabel(1, true)).toBe("Searching web");
    expect(getSearchStackLabel(3, true)).toBe("Running 3 searches");
    expect(getSearchStackLabel(1, false)).toBe("Ran 1 search");
    expect(getSearchStackLabel(3, false)).toBe("Ran 3 searches");
  });

  test("skips private and untrusted domains for favicons", () => {
    expect(isPublicSearchDomain("gladia.io")).toBe(true);
    expect(isPublicSearchDomain("intranet")).toBe(false);
    expect(isPublicSearchDomain("vault.internal")).toBe(false);
    expect(isPublicSearchDomain("192.168.1.20")).toBe(false);
    expect(isPublicSearchDomain("localhost")).toBe(false);
  });
});
