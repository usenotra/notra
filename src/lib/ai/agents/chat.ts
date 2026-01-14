import { withSupermemory } from "@supermemory/tools/ai-sdk";
import { stepCountIs, ToolLoopAgent } from "ai";
import {
  createEditMarkdownTool,
  createGetMarkdownTool,
} from "@/lib/ai/tools/edit-markdown";
import { openrouter } from "@/lib/openrouter";

interface ChatAgentContext {
  organizationId: string;
  currentMarkdown: string;
  selectedText?: string;
  onMarkdownUpdate: (markdown: string) => void;
}

export function createChatAgent(context: ChatAgentContext) {
  const modelWithMemory = withSupermemory(
    openrouter("moonshotai/kimi-k2-0905"),
    context.organizationId
  );

  let markdown = context.currentMarkdown;

  const editContext = {
    getMarkdown: () => markdown,
    setMarkdown: (nextMarkdown: string) => {
      markdown = nextMarkdown;
      context.onMarkdownUpdate(nextMarkdown);
    },
  };

  const selectionContext = context.selectedText
    ? `\n\nThe user has selected the following text (focus changes on this area):\n"""\n${context.selectedText}\n"""`
    : "";

  return new ToolLoopAgent({
    model: modelWithMemory,
    tools: {
      getMarkdown: createGetMarkdownTool(editContext),
      editMarkdown: createEditMarkdownTool(editContext),
    },
    instructions: `You are a helpful content editor assistant with memory of past interactions. Your job is to help users edit and improve their markdown documents.

## Capabilities
- Edit markdown content (replace, insert, delete operations)
- Remember context from previous conversations with this organization
- Scrape websites to gather information when needed for content creation

## Workflow
1. First, use getMarkdown to see the current document with line numbers
2. Analyze what changes are needed based on the user's request
3. Use editMarkdown to apply precise changes (always work from bottom to top)
4. Verify your changes are correct

## Guidelines
- Make minimal, precise edits - don't rewrite more than necessary
- Preserve the document's existing style and formatting
- When the user selects text, focus changes ONLY on that section
- Use line numbers accurately (they are 1-indexed)
- For multi-line insertions, use \\n in the content field
${selectionContext}

## Memory
You have access to organizational memory. Use it to:
- Remember user preferences and writing style
- Recall past editing patterns
- Maintain consistency across documents`,
    stopWhen: stepCountIs(15),
  });
}
