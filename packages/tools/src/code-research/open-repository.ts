import { CODE_RESEARCH_TOOL_DESCRIPTIONS } from "@notra/ai/constants/code-research";
import { openRepositoryInputSchema } from "@notra/ai/schemas/code-research-tools";
import { openRepository } from "@notra/ai/utils/code-research-actions";
import { defineTool } from "eve/tools";

import type { GenerationConfig } from "../types/github-tools";
import { getCodeResearchScope } from "../utils/code-research";
import {
  getAllowedCommitShaSet,
  getGenerationConfig,
} from "../utils/generation-config";

// A run limited to selected items may only open those items' code. Each
// kind of target needs its own allowlist, so a run limited to pull requests
// cannot open arbitrary commits and the other way around.
function assertTargetAllowed(
  config: GenerationConfig,
  input: {
    integrationId: string;
    pullRequestNumber?: number;
    commitSha?: string;
    branch?: string;
  }
) {
  const filters = config.selectionFilters;
  const allowedPullRequests =
    filters?.allowedPullRequestNumbersByIntegrationId?.[input.integrationId];
  const allowedShas = getAllowedCommitShaSet(config);
  const hasSelection =
    filters?.allowedPullRequestNumbersByIntegrationId !== undefined ||
    filters?.allowedReleaseTagsByIntegrationId !== undefined ||
    filters?.allowedReleaseTagsGlobal !== undefined ||
    allowedShas !== undefined;
  if (!hasSelection) {
    return;
  }
  if (input.pullRequestNumber !== undefined) {
    if (!allowedPullRequests?.includes(input.pullRequestNumber)) {
      throw new Error(
        `Pull request #${String(input.pullRequestNumber)} is outside the selected items for this run.`
      );
    }
    return;
  }
  if (input.commitSha) {
    if (!allowedShas?.has(input.commitSha.trim().toLowerCase())) {
      throw new Error(
        `Commit ${input.commitSha} is outside the selected items for this run.`
      );
    }
    return;
  }
  throw new Error(
    "This run is limited to selected items. Open one of the selected pull requests or commits instead of a branch."
  );
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
