import { afterAll, describe, expect, mock, test } from "bun:test";

import {
  GEO_OPENCODE_BOX_API_KEY_ENV,
  GEO_OPENCODE_MODEL_API_KEY_ENV,
} from "@notra/ai/constants/geo-opencode";

const boxKey = process.env[GEO_OPENCODE_BOX_API_KEY_ENV];
const modelKey = process.env[GEO_OPENCODE_MODEL_API_KEY_ENV];
process.env[GEO_OPENCODE_BOX_API_KEY_ENV] = "test-box-key";
process.env[GEO_OPENCODE_MODEL_API_KEY_ENV] = "test-model-key";

afterAll(() => {
  if (boxKey === undefined) {
    delete process.env[GEO_OPENCODE_BOX_API_KEY_ENV];
  } else {
    process.env[GEO_OPENCODE_BOX_API_KEY_ENV] = boxKey;
  }
  if (modelKey === undefined) {
    delete process.env[GEO_OPENCODE_MODEL_API_KEY_ENV];
  } else {
    process.env[GEO_OPENCODE_MODEL_API_KEY_ENV] = modelKey;
  }
});

const searchUrl = "https://example.com/search-result";
const citedUrl = "https://docs.example.com/cited";
const answers = [
  "Another site has the answer.",
  `See [the documentation](${citedUrl}).`,
];
let turn = 0;

mock.module("@notra/ai/utils/geo-opencode-box", () => ({
  createGeoOpenCodeBox: async () => ({
    id: "test-box",
    agent: {
      stream: async ({
        onToolUse,
        onToolResult,
      }: {
        onToolUse: (tool: { input: { query: string } }) => void;
        onToolResult: (result: { output: { url: string } }) => void;
      }) => {
        onToolUse({ input: { query: "example" } });
        onToolResult({ output: { url: searchUrl } });
        return {
          async *[Symbol.asyncIterator]() {},
          result: answers[turn++],
          cost: {
            totalUsd: 0,
            computeMs: 0,
            inputTokens: 0,
            cachedInputTokens: 0,
            outputTokens: 0,
          },
        };
      },
    },
  }),
  createGeoOpenCodeBoxName: () => "test-box",
  deleteGeoOpenCodeBox: async () => {},
}));

const { askGeoOpenCodeConversation } = await import("./geo-opencode");

describe("OpenCode source provenance", () => {
  test("keeps searched URLs in grounding and answer links in citations", async () => {
    const results = await askGeoOpenCodeConversation(["first", "second"]);
    expect(results.map((result) => result.sources)).toEqual([
      [],
      [{ url: citedUrl, title: null }],
    ]);
    expect(results.map((result) => result.groundingSources)).toEqual([
      [{ url: searchUrl, title: null }],
      [{ url: searchUrl, title: null }],
    ]);
  });
});
