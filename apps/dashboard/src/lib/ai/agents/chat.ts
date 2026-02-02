import { withSupermemory } from "@supermemory/tools/ai-sdk";
import { stepCountIs, ToolLoopAgent } from "ai";
import { createMarkdownTools } from "@/lib/ai/tools/edit-markdown";
import { getSkillByName, listAvailableSkills } from "@/lib/ai/tools/skills";
import { selectModel, routeMessage } from "@/lib/ai/orchestration/router";
import { openrouter } from "@/lib/openrouter";

interface ChatAgentContext {
  organizationId: string;
  currentMarkdown: string;
  selectedText?: string;
  onMarkdownUpdate: (markdown: string) => void;
  brandContext?: string;
}

export async function createChatAgent(
  context: ChatAgentContext,
  instruction: string,
) {
  const decision = await routeMessage(instruction, false);
  const model = selectModel(decision);

  const modelWithMemory = withSupermemory(
    openrouter(model),
    context.organizationId,
  );

  const { getMarkdown, editMarkdown } = createMarkdownTools({
    currentMarkdown: context.currentMarkdown,
    onUpdate: context.onMarkdownUpdate,
  });

  const selectionContext = context.selectedText
    ? `\n\nThe user has selected the following text (focus changes on this area):\n"""\n${context.selectedText}\n"""`
    : "";

  const brandContext = context.brandContext
    ? `\n\nBrand identity context:\n${context.brandContext}`
    : "";

  return new ToolLoopAgent({
    model: modelWithMemory,
    tools: {
      getMarkdown,
      editMarkdown,
      listAvailableSkills: listAvailableSkills(),
      getSkillByName: getSkillByName(),
    },
    instructions: `You are a content editor assistant. Help users edit their markdown documents.${brandContext}

## Workflow
1. Use getMarkdown to see the document with line numbers
2. Use editMarkdown to apply changes (work from bottom to top)

## Edit Operations
- replaceLine: { op: "replaceLine", line: number, content: string }
- replaceRange: { op: "replaceRange", startLine: number, endLine: number, content: string }
- insert: { op: "insert", afterLine: number, content: string }
- deleteLine: { op: "deleteLine", line: number }
- deleteRange: { op: "deleteRange", startLine: number, endLine: number }

## Guidelines
- Make minimal edits
- Line numbers are 1-indexed
- For multi-line content use \\n in content string
- When user selects text, focus only on that section
- IMPORTANT: Do NOT output the content of your edits in text. Only use the editMarkdown tool. Keep text responses brief - just explain what you're doing, not the actual content.
${selectionContext}`,
    stopWhen: stepCountIs(15),
  });
}
