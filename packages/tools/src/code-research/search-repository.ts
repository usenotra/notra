import { CODE_RESEARCH_TOOL_DESCRIPTIONS } from "@notra/ai/constants/code-research";
import { searchRepositoryInputSchema } from "@notra/ai/schemas/code-research-tools";
import { searchRepository } from "@notra/ai/utils/code-research-actions";
import { defineTool } from "eve/tools";

import { getCodeResearchScope } from "../utils/code-research";

export function createSearchRepositoryTool() {
  return defineTool({
    description: CODE_RESEARCH_TOOL_DESCRIPTIONS.search_repository,
    inputSchema: searchRepositoryInputSchema,
    async execute(input, ctx) {
      return await searchRepository(getCodeResearchScope(ctx), input);
    },
  });
}
