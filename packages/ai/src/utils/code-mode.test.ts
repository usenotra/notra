import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { STANDALONE_CODE_MODE_TOOL_NAMES } from "@notra/ai/constants/code-mode";
import { getStandaloneApprovalToolNames } from "@notra/ai/orchestration/standalone-tool-registry";

// The code researcher is only registered when a box key is configured.
process.env.UPSTASH_BOX_API_KEY ??= "test-box-key";

describe("standalone code mode policy", () => {
  test("keeps approval tools out of code mode", () => {
    const codeModeToolNames = new Set<string>(STANDALONE_CODE_MODE_TOOL_NAMES);

    for (const toolName of getStandaloneApprovalToolNames()) {
      assert.equal(codeModeToolNames.has(toolName), false, toolName);
    }
  });
});
