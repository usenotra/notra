import { CODE_RESEARCH_TOOL_DESCRIPTIONS } from "@notra/ai/constants/code-research";
import { openRepositoryInputSchema } from "@notra/ai/schemas/code-research-tools";
import { openRepository } from "@notra/ai/utils/code-research-actions";
import { defineTool } from "eve/tools";

import { getCodeResearchScope } from "../utils/code-research";
import {
  assertPullRequestAllowed,
  getGenerationConfig,
} from "../utils/generation-config";

export function createOpenRepositoryTool() {
  return defineTool({
    description: CODE_RESEARCH_TOOL_DESCRIPTIONS.open_repository,
    inputSchema: openRepositoryInputSchema,
    async execute(input, ctx) {
      if (input.pullRequestNumber !== undefined) {
        assertPullRequestAllowed(
          getGenerationConfig(ctx),
          input.integrationId,
          input.pullRequestNumber
        );
      }
      return await openRepository(getCodeResearchScope(ctx), input);
    },
  });
}
