import { describe, expect, test } from "bun:test";

import {
  promptMentionsBrand,
  stripBrandTerms,
} from "../src/geo/suggestion-keywords";

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
