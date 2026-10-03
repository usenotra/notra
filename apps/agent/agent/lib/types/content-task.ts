import type { contentWriterResultSchema } from "@notra/ai/schemas/content-writer-result";
import type { WorkflowToolDefinition } from "eve/tools";
import type { z } from "zod";

import type { contentTaskInputSchema } from "../schemas/content-task";

export type ContentTaskInput = z.infer<typeof contentTaskInputSchema>;
export type ContentTaskResult = z.infer<typeof contentWriterResultSchema>;
export type ContentTaskTool = Extract<
  WorkflowToolDefinition<ContentTaskInput, ContentTaskResult>,
  { execution?: never }
>;
