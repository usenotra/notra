import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  CODE_MODE_TOOL_NAME,
  STANDALONE_CODE_MODE_TOOL_NAMES,
} from "@notra/ai/constants/code-mode";
import {
  buildStandaloneToolSet,
  getStandaloneApprovalToolNames,
} from "@notra/ai/orchestration/standalone-tool-registry";
import { generateText } from "ai";
import { MockLanguageModelV4 } from "ai/test";

import { withStandaloneCodeMode } from "./code-mode";

const ORGANIZATION_ID = "org_code_mode_test";

// Tools that write data, need approval, or render in the chat UI (charts, post
// cards, brand favicons) must stay directly callable. A new standalone tool
// has to be added here or to STANDALONE_CODE_MODE_TOOL_NAMES.
const DIRECT_TOOL_NAMES = [
  "addBrandReference",
  "createBlogPost",
  "createChangelog",
  "createImage",
  "createInvestorUpdate",
  "createLinkedInPost",
  "createSkill",
  "createTwitterPost",
  "getBrandIdentity",
  "getGeoCompetitorShare",
  "getGeoOverview",
  "getGeoTimeseries",
  "listBrandIdentities",
  "updatePost",
];

function buildFullStandaloneRegistry() {
  return buildStandaloneToolSet({
    organizationId: ORGANIZATION_ID,
    chatId: "chat_code_mode_test",
    userId: "user_code_mode_test",
    validatedIntegrations: [
      {
        id: "github_integration",
        type: "github",
        enabled: true,
        displayName: "GitHub",
        organizationId: ORGANIZATION_ID,
        repositories: [
          {
            id: "repository",
            owner: "usenotra",
            repo: "notra",
            defaultBranch: "main",
            enabled: true,
          },
        ],
      },
      {
        id: "linear_integration",
        type: "linear",
        enabled: true,
        displayName: "Linear",
        organizationId: ORGANIZATION_ID,
      },
      {
        id: "granola_integration",
        type: "granola",
        enabled: true,
        displayName: "Granola",
        organizationId: ORGANIZATION_ID,
      },
    ],
    postResult: {},
  }).tools;
}

function sortedNames(names: Iterable<string>) {
  return [...names].sort();
}

describe("standalone code mode policy", () => {
  test("classifies every standalone tool as code mode or direct", () => {
    const registryToolNames = Object.keys(buildFullStandaloneRegistry());

    assert.deepEqual(
      sortedNames(registryToolNames),
      sortedNames([...STANDALONE_CODE_MODE_TOOL_NAMES, ...DIRECT_TOOL_NAMES])
    );
  });

  test("keeps approval tools out of code mode", () => {
    const codeModeToolNames = new Set<string>(STANDALONE_CODE_MODE_TOOL_NAMES);

    for (const toolName of getStandaloneApprovalToolNames()) {
      assert.equal(codeModeToolNames.has(toolName), false, toolName);
    }
  });

  test("sends only direct tools and code_mode to the model", async () => {
    const { tools, toolCallers } = withStandaloneCodeMode(
      buildFullStandaloneRegistry()
    );
    const model = new MockLanguageModelV4({
      doGenerate: {
        content: [{ type: "text", text: "ok" }],
        finishReason: { unified: "stop", raw: "stop" },
        usage: {
          inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
          outputTokens: { total: 1, text: 1, reasoning: 0 },
        },
        warnings: [],
      },
    });

    await generateText({
      model,
      prompt: "Which tools can you use?",
      tools,
      experimental_toolCallers: toolCallers,
    });

    const modelTools = (model.doGenerateCalls[0]?.tools ?? []).filter(
      (modelTool) => modelTool.type === "function"
    );
    assert.deepEqual(
      sortedNames(modelTools.map((modelTool) => modelTool.name)),
      sortedNames([...DIRECT_TOOL_NAMES, CODE_MODE_TOOL_NAME])
    );

    const codeModeDescription =
      modelTools.find((modelTool) => modelTool.name === CODE_MODE_TOOL_NAME)
        ?.description ?? "";
    for (const toolName of STANDALONE_CODE_MODE_TOOL_NAMES) {
      assert.ok(codeModeDescription.includes(`${toolName}:`), toolName);
    }
  });
});
