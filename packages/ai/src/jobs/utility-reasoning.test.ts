import { beforeEach, describe, expect, mock, test } from "bun:test";

import { MockLanguageModelV4 } from "ai/test";

const textPost = {
  title: "SentDM delivery reports",
  contentType: "blog_post",
  markdown: "Provider errors and webhook retries",
  content: "Provider errors and webhook retries",
};
let postRows = [textPost];
let responseField = "title";
let responseText = "SentDM delivery reports and webhook retries";
let failGeneration = false;
const model = new MockLanguageModelV4({
  modelId: "openai/gpt-6-luna",
  supportedUrls: { "*/*": [/.*/] },
  doGenerate: async () => {
    if (failGeneration) {
      throw new Error("Provider refused");
    }
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({ [responseField]: responseText }),
        },
      ],
      finishReason: { unified: "stop" as const, raw: "stop" },
      usage: {
        inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
        outputTokens: { total: 1, text: 1, reasoning: 0 },
      },
      warnings: [],
    };
  },
});
const gateway = mock(() => model);
const selection = {
  from: () => selection,
  where: () => selection,
  orderBy: () => selection,
  limit: async () => postRows,
};
const update = mock();
mock.module("@notra/db/drizzle", () => ({
  db: {
    select: () => selection,
    query: { organizations: { findFirst: async () => ({ name: "SentDM" }) } },
    update,
  },
}));
mock.module("@notra/ai/gateway", () => ({ gateway }));

const { generateCollectionTitle } = await import("./collection-title");
const { generateContentCommitHeadline } =
  await import("../utils/content-commit-message");

beforeEach(() => {
  postRows = [textPost];
  responseField = "title";
  responseText = "SentDM delivery reports and webhook retries";
  failGeneration = false;
  gateway.mockClear();
  update.mockClear();
  model.doGenerateCalls.length = 0;
});

describe("reasoning-free mechanical title jobs", () => {
  test.each(["text", "image"])(
    "collection title for %s uses no reasoning and preserves source input",
    async (kind) => {
      if (kind === "image") {
        postRows = [
          {
            ...textPost,
            contentType: "image",
            markdown: "",
            content: "https://example.invalid/cover.png",
          },
        ];
      }
      expect(
        await generateCollectionTitle({
          organizationId: "org-test",
          collectionId: "collection-test",
          dryRun: true,
        })
      ).toBe(responseText);
      expect(update).not.toHaveBeenCalled();
      const sent = model.doGenerateCalls[0];
      expect(sent?.providerOptions?.openai?.reasoningEffort).toBe("none");
      expect(sent?.providerOptions?.gateway?.tags).toEqual([
        "content-collection-title",
      ]);
      if (kind === "image") {
        expect(JSON.stringify(sent?.prompt)).toContain(
          "https://example.invalid/cover.png"
        );
      } else {
        expect(JSON.stringify(sent?.prompt)).toContain(textPost.markdown);
      }
    }
  );

  test("empty collections still avoid a model call", async () => {
    postRows = [];
    expect(
      await generateCollectionTitle({
        organizationId: "org-test",
        collectionId: "collection-test",
        dryRun: true,
      })
    ).toBeNull();
    expect(gateway).not.toHaveBeenCalled();
  });

  test("commit headlines use no reasoning while retaining previous and updated source text", async () => {
    responseField = "headline";
    responseText = "docs: add CSV export date range";
    expect(
      await generateContentCommitHeadline({
        organizationId: "org-test",
        title: "CSV exports",
        previousMarkdown: "All rows",
        nextMarkdown: "Date range selection",
        fallback: "docs: update CSV exports",
      })
    ).toBe(responseText);
    const sent = model.doGenerateCalls[0];
    expect(sent?.providerOptions?.openai?.reasoningEffort).toBe("none");
    expect(sent?.providerOptions?.gateway?.tags).toEqual([
      "content-commit-message",
    ]);
    expect(JSON.stringify(sent?.prompt)).toContain("All rows");
    expect(JSON.stringify(sent?.prompt)).toContain("Date range selection");
  });

  test("unchanged content still avoids a model call", async () => {
    expect(
      await generateContentCommitHeadline({
        organizationId: "org-test",
        title: "CSV exports",
        previousMarkdown: "Same",
        nextMarkdown: "Same",
        fallback: "docs: update CSV exports",
      })
    ).toBe("docs: update CSV exports");
    expect(gateway).not.toHaveBeenCalled();
  });

  test("commit headline failures still preserve the deterministic fallback", async () => {
    failGeneration = true;
    expect(
      await generateContentCommitHeadline({
        organizationId: "org-test",
        title: "CSV exports",
        nextMarkdown: "Date range selection",
        fallback: "docs: update CSV exports",
      })
    ).toBe("docs: update CSV exports");
  });
});
