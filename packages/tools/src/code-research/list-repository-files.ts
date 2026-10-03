import { CODE_RESEARCH_TOOL_DESCRIPTIONS } from "@notra/ai/constants/code-research";
import { listRepositoryFilesInputSchema } from "@notra/ai/schemas/code-research-tools";
import { listRepositoryFiles } from "@notra/ai/utils/code-research-actions";
import { defineTool } from "eve/tools";

import { getCodeResearchScope } from "../utils/code-research";

export function createListRepositoryFilesTool() {
  return defineTool({
    description: CODE_RESEARCH_TOOL_DESCRIPTIONS.list_repository_files,
    inputSchema: listRepositoryFilesInputSchema,
    async execute(input, ctx) {
      return await listRepositoryFiles(getCodeResearchScope(ctx), input);
    },
  });
}
