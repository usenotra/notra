import { codeResearchBriefSchema } from "@notra/ai/schemas/code-research";
import { contentWriterResultSchema } from "@notra/ai/schemas/content-writer-result";
import type { CodeResearchBrief } from "@notra/ai/types/code-research";
import { releaseCodeResearchWorkspaces } from "@notra/ai/utils/code-research-session";
import { isCodeResearchEnabled } from "@notra/tools/utils/code-research";
import { defineWorkflowTool, type WorkflowToolContext } from "eve/tools";

import { contentTaskInputSchema } from "../lib/schemas/content-task";
import type {
  ContentTaskInput,
  ContentTaskResult,
  ContentTaskTool,
} from "../lib/types/content-task";

async function canResearchCode(
  session: WorkflowToolContext["session"]
): Promise<boolean> {
  "use step";

  return isCodeResearchEnabled({ session });
}

async function releaseResearchBoxes(sessionKey: string): Promise<void> {
  "use step";

  await releaseCodeResearchWorkspaces(sessionKey);
}

// The brief only enriches the post, so a failed research run never fails the task.
async function researchFeature(
  ctx: WorkflowToolContext,
  message: string
): Promise<CodeResearchBrief | null> {
  try {
    const brief = codeResearchBriefSchema.parse(
      await ctx.agent("code-researcher", { message })
    );
    return brief.status === "found" ? brief : null;
  } catch {
    return null;
  }
}

async function generateContentTask(
  { message, codeResearch }: ContentTaskInput,
  ctx: WorkflowToolContext
): Promise<ContentTaskResult> {
  // codeql[js/unknown-directive] Eve requires this directive for durable execution.
  "use workflow";

  const shouldResearch =
    codeResearch !== undefined && (await canResearchCode(ctx.session));
  // Task runs get no follow-up questions, so their boxes go as soon as the
  // writer is done instead of idling until the TTL.
  const sessionKey = ctx.session.parent?.rootSessionId ?? ctx.session.id;
  try {
    const brief = shouldResearch
      ? await researchFeature(ctx, codeResearch)
      : null;
    const writerMessage = brief
      ? `${message}\n\nCode research brief (JSON):\n${JSON.stringify(brief)}`
      : message;
    const result = await ctx.agent("content-writer", {
      message: writerMessage,
    });
    return contentWriterResultSchema.parse(result);
  } finally {
    if (shouldResearch) {
      await releaseResearchBoxes(sessionKey);
    }
  }
}

const generateContent: ContentTaskTool = defineWorkflowTool<
  typeof contentTaskInputSchema,
  Promise<ContentTaskResult>
>({
  description:
    "Generate and save content through the content-writer, waiting durably for its final created/skipped/failed result. Use this for automated content tasks instead of calling the background content-writer subagent directly. Pass the complete task, sources, and lookback context in message. For a task about one specific feature, also pass codeResearch so the code-researcher reads the repository first.",
  inputSchema: contentTaskInputSchema,
  outputSchema: contentWriterResultSchema,
  execute: generateContentTask,
});

export default generateContent;
