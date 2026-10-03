import { describe, expect, test } from "bun:test";

import type { GscQueryRow } from "@notra/ai/types/google-search-console";

import { selectKeywordsForModel } from "../src/geo/suggestion-keywords";

function query(text: string): GscQueryRow {
  return { query: text, impressions: 80, clicks: 2, position: 11 };
}

describe("selectKeywordsForModel", () => {
  test("keeps category queries that only mention a nav word", () => {
    const selected = selectKeywordsForModel(
      [
        query("changelog generator"),
        query("status page software"),
        query("privacy policy generator"),
        query("sendgrid changelog"),
      ],
      []
    );
    expect(selected.map((row) => row.query)).toEqual([
      "changelog generator",
      "status page software",
      "privacy policy generator",
      "sendgrid changelog",
    ]);
  });

  test("drops own-site login and careers lookups", () => {
    const selected = selectKeywordsForModel(
      [
        query("postmark login"),
        query("acme careers"),
        query("smtp login failed"),
        query("best tools for sending email"),
      ],
      []
    );
    expect(selected.map((row) => row.query)).toEqual([
      "smtp login failed",
      "best tools for sending email",
    ]);
  });
});
