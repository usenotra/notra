import { CODE_RESEARCH_TOOL_DESCRIPTIONS } from "@notra/ai/constants/code-research";
import { openRepositoryInputSchema } from "@notra/ai/schemas/code-research-tools";
import { openRepository } from "@notra/ai/utils/code-research-actions";
import { defineTool } from "eve/tools";

import type { GenerationConfig } from "../types/github-tools";
import { getCodeResearchScope } from "../utils/code-research";
import {
  assertPullRequestAllowed,
  getAllowedCommitShaSet,
  getGenerationConfig,
} from "../utils/generation-config";

// A run limited to selected items may only open those items' code.
function assertTargetAllowed(
  config: GenerationConfig,
  input: {
    integrationId: string;
    pullRequestNumber?: number;
    commitSha?: string;
    branch?: string;
  }
) {
  if (input.pullRequestNumber !== undefined) {
    assertPullRequestAllowed(
      config,
      input.integrationId,
      input.pullRequestNumber
    );
    return;
  }
  const allowedShas = getAllowedCommitShaSet(config);
  if (input.commitSha) {
    if (allowedShas && !allowedShas.has(input.commitSha.trim().toLowerCase())) {
      throw new Error(
        `Commit ${input.commitSha} is outside the selected items for this run.`
      );
    }
    return;
  }
  const hasSelection =
    allowedShas !== undefined ||
    config.selectionFilters?.allowedPullRequestNumbersByIntegrationId?.[
      input.integrationId
    ] !== undefined;
  if (input.branch && hasSelection) {
    throw new Error(
      "This run is limited to selected pull requests and commits. Open one of those instead of a branch."
    );
  }
}

export function createOpenRepositoryTool() {
  return defineTool({
    description: CODE_RESEARCH_TOOL_DESCRIPTIONS.open_repository,
    inputSchema: openRepositoryInputSchema,
    async execute(input, ctx) {
      assertTargetAllowed(getGenerationConfig(ctx), input);
      return await openRepository(getCodeResearchScope(ctx), input);
    },
  });
}
