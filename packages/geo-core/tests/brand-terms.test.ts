import { describe, expect, test } from "bun:test";

import type { GscQueryRow } from "@notra/ai/types/google-search-console";

import {
  promptMentionsBrand,
  selectKeywordsForModel,
  stripBrandTerms,
} from "../src/geo/suggestion-keywords";
import { buildGscSuggestionPrompt } from "../src/geo/suggestion-prompt";

function query(
  text: string,
  impressions: number,
  clicks: number,
  position: number
): GscQueryRow {
  return { query: text, impressions, clicks, position };
}

/*
 * Built at runtime, not written as escapes: the formatter collapses "\u0301"
 * into a composed character and the decomposed case would silently stop being
 * covered.
 */
const COMPOSED = "Nestl\u00e9".normalize("NFC");
const DECOMPOSED = COMPOSED.normalize("NFD");

describe("stripBrandTerms", () => {
  test("removes a plain ASCII brand", () => {
    expect(stripBrandTerms("Zalando ships fast", ["Zalando"])).toBe(
      "ships fast"
    );
  });

  test("removes a brand ending on a non-ASCII letter", () => {
    expect(stripBrandTerms("Nestlé makes chocolate", ["Nestlé"])).toBe(
      "makes chocolate"
    );
  });

  test("removes a brand starting on a non-ASCII letter", () => {
    expect(stripBrandTerms("Émile tools for teams", ["Émile"])).toBe(
      "tools for teams"
    );
  });

  test("removes a brand written with no ASCII letters at all", () => {
    expect(stripBrandTerms("日本語 ブランド review", ["ブランド"])).toBe(
      "日本語 review"
    );
  });

  test("matches across normalization forms in both directions", () => {
    expect(DECOMPOSED).not.toBe(COMPOSED);
    expect(stripBrandTerms(`${DECOMPOSED} makes chocolate`, [COMPOSED])).toBe(
      "makes chocolate"
    );
    expect(stripBrandTerms(`${COMPOSED} makes chocolate`, [DECOMPOSED])).toBe(
      "makes chocolate"
    );
  });

  test("joins multi-token brands over separators", () => {
    expect(stripBrandTerms("best red-bull energy", ["Red Bull"])).toBe(
      "best energy"
    );
  });

  test("leaves words that merely contain the term", () => {
    expect(stripBrandTerms("github is great", ["hub"])).toBe("github is great");
    expect(stripBrandTerms("Nestleaf plants", ["Nestlé"])).toBe(
      "Nestleaf plants"
    );
  });
});

describe("promptMentionsBrand", () => {
  test("matches across normalization forms", () => {
    expect(promptMentionsBrand(`${DECOMPOSED} chocolate`, [COMPOSED])).toBe(
      true
    );
    expect(promptMentionsBrand(`${COMPOSED} chocolate`, [DECOMPOSED])).toBe(
      true
    );
  });

  test("does not match a term inside a longer word", () => {
    expect(promptMentionsBrand("github is great", ["hub"])).toBe(false);
  });
});

describe("selectKeywordsForModel", () => {
  test("ranks a query the site does not win ahead of one it already owns", () => {
    const selected = selectKeywordsForModel(
      [
        query("email marketing platform", 500, 200, 1.2),
        query("promo emails landing in spam", 100, 2, 12),
      ],
      []
    );
    expect(selected.map((row) => row.query)).toEqual([
      "promo emails landing in spam",
      "email marketing platform",
    ]);
  });

  test("a high-CTR position-1 head term loses to a smaller mid-position gap", () => {
    const selected = selectKeywordsForModel(
      [
        query("transactional email api", 12_000, 4800, 1.2),
        query("cheapest transactional email for startups", 200, 8, 11.2),
      ],
      []
    );
    expect(selected.map((row) => row.query)).toEqual([
      "cheapest transactional email for startups",
      "transactional email api",
    ]);
  });

  test("drops branded and navigational queries", () => {
    const selected = selectKeywordsForModel(
      [
        query("acme pricing", 800, 40, 2),
        query("stripe changelog", 900, 20, 5),
        query("best tools for sending email", 80, 2, 11),
        query("google docs alternative", 70, 2, 9),
      ],
      ["acme"]
    );
    expect(selected.map((row) => row.query)).toEqual([
      "best tools for sending email",
      "google docs alternative",
    ]);
  });

  test("caps near-duplicate head terms so a second intent still fits", () => {
    const duplicates = [
      "tools",
      "software",
      "platforms",
      "apps",
      "services",
    ].map((tail, index) =>
      query(`best email marketing ${tail}`, 1000 - index, 10, 10)
    );
    const other = query("stop promo emails going to spam", 50, 1, 14);
    const selected = selectKeywordsForModel([...duplicates, other], []);
    expect(
      selected.filter((row) => row.query.startsWith("best email marketing"))
    ).toHaveLength(3);
    expect(selected.some((row) => row.query === other.query)).toBe(true);
  });
});

describe("buildGscSuggestionPrompt", () => {
  test("asks for opportunity gaps instead of the highest-impression queries", () => {
    const prompt = buildGscSuggestionPrompt({
      companyName: "Acme",
      companyDescription: "Sends transactional email",
      competitors: ["Postmark"],
      siteUrl: "https://acme.test",
      keywords: [query("promo emails landing in spam", 100, 2, 12)],
      existingPrompts: [],
    });
    expect(prompt).toContain("strongest content opportunity first");
    expect(prompt).toContain("visible, not winning");
    expect(prompt).not.toContain("most impressions");
  });
});
