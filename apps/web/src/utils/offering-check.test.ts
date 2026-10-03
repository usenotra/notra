/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import type { OfferingMarkdownNode } from "@/types/offering-check";

import {
  createFeatureHighlightPlugin,
  getOfferingChatPhase,
  getOfferingCheckBrandFeatureIdentity,
  getOfferingCheckCacheIdentity,
  stripAnswerCitations,
} from "./offering-check";
import { offeringReportHref } from "./offering-report";

describe("offering check identities", () => {
  const first = {
    domain: "example.com",
    feature: "AI   Search",
    description: "The original description",
  };
  const differentDescription = {
    domain: "EXAMPLE.COM",
    feature: " ai search ",
    description: "A different description",
  };

  test("rate-limits by normalized brand and feature", () => {
    expect(getOfferingCheckBrandFeatureIdentity(differentDescription)).toBe(
      getOfferingCheckBrandFeatureIdentity(first)
    );
    expect(
      getOfferingCheckBrandFeatureIdentity({
        ...first,
        feature: "AI Writer",
      })
    ).not.toBe(getOfferingCheckBrandFeatureIdentity(first));
  });

  test("caches different descriptions separately", () => {
    expect(getOfferingCheckCacheIdentity(differentDescription)).not.toBe(
      getOfferingCheckCacheIdentity(first)
    );
    expect(
      getOfferingCheckCacheIdentity({
        domain: "EXAMPLE.COM",
        feature: " ai search ",
        description: " the original   description ",
      })
    ).toBe(getOfferingCheckCacheIdentity(first));
  });
});

test("keeps the private description out of the report URL", () => {
  const href = offeringReportHref({
    domain: "example.com",
    feature: "AI: Search",
    description: "Private launch details",
  });

  expect(href).toBe("/offering/report?domain=example.com&feature=AI%3A+Search");
  expect(href).not.toContain("Private");
});

test("highlights feature text after Markdown parsing", () => {
  const tree: OfferingMarkdownNode = {
    type: "root",
    children: [
      {
        type: "element",
        tagName: "a",
        properties: { href: "https://example.com" },
        children: [{ type: "text", value: "AI Search" }],
      },
      {
        type: "element",
        tagName: "code",
        children: [{ type: "text", value: "AI Search" }],
      },
    ],
  };

  createFeatureHighlightPlugin("AI Search")()(tree);

  expect(tree.children?.[0]?.children?.[0]?.tagName).toBe("mark");
  expect(tree.children?.[0]?.properties?.href).toBe("https://example.com");
  expect(tree.children?.[1]?.children).toEqual([
    { type: "text", value: "AI Search" },
  ]);
});

test("highlights only complete Unicode word spans", () => {
  const tree: OfferingMarkdownNode = {
    type: "root",
    children: [
      {
        type: "text",
        value: "AI appears alone, not in said or mail. Café, not Cafés.",
      },
    ],
  };

  createFeatureHighlightPlugin("AI")()(tree);

  expect(
    tree.children?.filter((child) => child.tagName === "mark")
  ).toHaveLength(1);

  const accentedTree: OfferingMarkdownNode = {
    type: "root",
    children: [{ type: "text", value: "Café and Caféine" }],
  };
  createFeatureHighlightPlugin("Café")()(accentedTree);

  expect(
    accentedTree.children?.filter((child) => child.tagName === "mark")
  ).toHaveLength(1);
});

test("moves from writing to done after the answer completes", () => {
  expect(getOfferingChatPhase(false, false, true, false)).toBe("writing");
  expect(getOfferingChatPhase(false, true, true, false)).toBe("done");
});

test("treats citation-only answers as empty", () => {
  expect(stripAnswerCitations("([1](https://example.com))")).toBe("");
});
