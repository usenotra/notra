import { expect, test } from "bun:test";

import {
  mergeKnowledgeRecords,
  parseKnowledgeScanOutput,
  pickKnowledgeUrls,
  scoreKnowledgeUrl,
} from "../src/utils/brand-knowledge";

test("ranks pricing and about above blog paths", () => {
  const origin = "https://acorn.example";
  expect(
    scoreKnowledgeUrl("https://acorn.example/pricing", origin)
  ).toBeGreaterThan(scoreKnowledgeUrl("https://acorn.example/about", origin));
  expect(scoreKnowledgeUrl("https://acorn.example/blog/hello", origin)).toBe(
    -1
  );
  expect(scoreKnowledgeUrl("https://acorn.example/careers", origin)).toBe(-1);
  expect(scoreKnowledgeUrl("https://acorn.example/login", origin)).toBe(-1);
  const picked = pickKnowledgeUrls(
    origin,
    [
      "https://acorn.example/blog/x",
      "https://acorn.example/pricing",
      "https://acorn.example/about",
      "https://acorn.example/docs/api",
    ],
    3
  );
  expect(picked[0]).toContain("/pricing");
  expect(picked).not.toContain("https://acorn.example/blog/x");
  const collapsed = pickKnowledgeUrls(
    "https://acorn.example",
    ["https://www.acorn.example/", "https://acorn.example/pricing"],
    3
  );
  expect(
    collapsed.filter((url) => knowledgeUrlLooksLikeHome(url))
  ).toHaveLength(1);
});

function knowledgeUrlLooksLikeHome(url: string) {
  try {
    return new URL(url).pathname === "/" || new URL(url).pathname === "";
  } catch {
    return false;
  }
}

test("drops extracted facts whose source URL was not supplied", () => {
  const facts = parseKnowledgeScanOutput(
    {
      facts: [
        {
          statement: "Starter is $49 per month.",
          category: "pricing",
          origin: "website",
          sourceUrl: "https://acorn.example/pricing",
        },
        {
          statement: "Invented HQ is Berlin.",
          category: "company",
          origin: "website",
          sourceUrl: "https://evil.example/lie",
        },
      ],
    },
    [
      {
        origin: "website",
        url: "https://acorn.example/pricing",
        markdown: "Starter is $49",
      },
    ]
  );
  expect(facts).toHaveLength(1);
  expect(facts[0]?.statement).toBe("Starter is $49 per month.");
});

test("keeps pinned and manual records across a rescan", () => {
  const merged = mergeKnowledgeRecords(
    [
      {
        id: "pin",
        statement: "Edited price is $59.",
        category: "pricing",
        origin: "website",
        pinned: true,
      },
      {
        id: "manual",
        statement: "Support hours are 9 to 5 ET.",
        category: "policy",
        origin: "manual",
      },
      {
        id: "stale",
        statement: "Old feature ships Friday.",
        category: "features",
        origin: "github",
      },
    ],
    [
      {
        statement: "Starter is $49 per month.",
        category: "pricing",
        origin: "website",
        sourceUrl: "https://acorn.example/pricing",
      },
    ]
  );
  expect(merged.map((record) => record.id).slice(0, 2)).toEqual([
    "pin",
    "manual",
  ]);
  expect(merged).toHaveLength(3);
  expect(merged[2]?.statement).toBe("Starter is $49 per month.");
  expect(merged.some((record) => record.id === "stale")).toBe(false);
});
