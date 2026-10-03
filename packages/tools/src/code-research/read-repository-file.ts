import { CODE_RESEARCH_TOOL_DESCRIPTIONS } from "@notra/ai/constants/code-research";
import { readRepositoryFileInputSchema } from "@notra/ai/schemas/code-research-tools";
import { readRepositoryFile } from "@notra/ai/utils/code-research-actions";
import { defineTool } from "eve/tools";

import { getCodeResearchScope } from "../utils/code-research";

export function createReadRepositoryFileTool() {
  return defineTool({
    description: CODE_RESEARCH_TOOL_DESCRIPTIONS.read_repository_file,
    inputSchema: readRepositoryFileInputSchema,
    async execute(input, ctx) {
      return await readRepositoryFile(getCodeResearchScope(ctx), input);
    },
  });
}
