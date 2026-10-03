import { CODE_RESEARCH_TOOL_DESCRIPTIONS } from "@notra/ai/constants/code-research";
import { repositoryHistoryInputSchema } from "@notra/ai/schemas/code-research-tools";
import { repositoryHistory } from "@notra/ai/utils/code-research-actions";
import { defineTool } from "eve/tools";

import { getCodeResearchScope } from "../utils/code-research";

export function createRepositoryHistoryTool() {
  return defineTool({
    description: CODE_RESEARCH_TOOL_DESCRIPTIONS.repository_history,
    inputSchema: repositoryHistoryInputSchema,
    async execute(input, ctx) {
      return await repositoryHistory(getCodeResearchScope(ctx), input);
    },
  });
}
