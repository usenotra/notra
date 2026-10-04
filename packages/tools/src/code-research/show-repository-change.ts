import { CODE_RESEARCH_TOOL_DESCRIPTIONS } from "@notra/ai/constants/code-research";
import { showRepositoryChangeInputSchema } from "@notra/ai/schemas/code-research-tools";
import { showRepositoryChange } from "@notra/ai/utils/code-research-actions";
import { defineTool } from "eve/tools";

import { getCodeResearchScope } from "../utils/code-research";

export function createShowRepositoryChangeTool() {
  return defineTool({
    description: CODE_RESEARCH_TOOL_DESCRIPTIONS.show_repository_change,
    inputSchema: showRepositoryChangeInputSchema,
    async execute(input, ctx) {
      return await showRepositoryChange(getCodeResearchScope(ctx), input);
    },
  });
}
