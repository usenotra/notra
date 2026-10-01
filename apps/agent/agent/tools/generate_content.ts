import { contentWriterResultSchema } from "@notra/ai/schemas/content-writer-result";
import { defineWorkflowTool, type WorkflowToolContext } from "eve/tools";

import { contentTaskInputSchema } from "../lib/schemas/content-task";
import type {
  ContentTaskInput,
  ContentTaskResult,
  ContentTaskTool,
} from "../lib/types/content-task";

async function generateContentTask(
  { message }: ContentTaskInput,
  ctx: WorkflowToolContext
): Promise<ContentTaskResult> {
  "use workflow";

  const result = await ctx.agent("content-writer", { message });
  return contentWriterResultSchema.parse(result);
}

const generateContent: ContentTaskTool = defineWorkflowTool<
  typeof contentTaskInputSchema,
  Promise<ContentTaskResult>
>({
  description:
    "Generate and save content through the content-writer, waiting durably for its final created/skipped/failed result. Use this for automated content tasks instead of calling the background content-writer subagent directly. Pass the complete task, sources, and lookback context in message.",
  inputSchema: contentTaskInputSchema,
  outputSchema: contentWriterResultSchema,
  execute: generateContentTask,
});

export default generateContent;
