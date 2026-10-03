import { describe, expect, test } from "bun:test";

import { normalizeGeneratedConversations } from "../src/geo/sequence-generation";

const brandTerms = ["acme", "acme.io"];

describe("normalizeGeneratedConversations", () => {
  test("keeps conversations with enough valid turns and drops brand mentions", () => {
    const result = normalizeGeneratedConversations(
      [
        {
          name: "  Startup on a budget  ",
          steps: [
            "what is the cheapest way to send transactional emails at scale",
            "we are a team of three, which options have a usable free tier",
            "is acme worth it for a small team",
            "what should we watch out for when switching providers later",
          ],
        },
        {
          name: "Too short",
          steps: ["how do i stop my emails from landing in spam folders", "ok"],
        },
      ],
      brandTerms,
      3
    );

    expect(result).toEqual([
      {
        name: "Startup on a budget",
        steps: [
          "what is the cheapest way to send transactional emails at scale",
          "we are a team of three, which options have a usable free tier",
          "what should we watch out for when switching providers later",
        ],
      },
    ]);
  });

  test("dedupes by name and respects the limit", () => {
    const steps = [
      "which email provider do agencies use for client newsletters",
      "we manage about twenty clients, what scales best for that",
      "how do these providers handle separate billing per client",
    ];
    const result = normalizeGeneratedConversations(
      [
        { name: "Agency", steps },
        { name: "agency", steps },
        { name: "Enterprise", steps },
        { name: "Nonprofit", steps },
      ],
      brandTerms,
      2
    );
    expect(result.map((conversation) => conversation.name)).toEqual([
      "Agency",
      "Enterprise",
    ]);
  });
});
