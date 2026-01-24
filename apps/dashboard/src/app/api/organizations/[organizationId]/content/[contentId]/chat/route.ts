import { withSupermemory } from "@supermemory/tools/ai-sdk";
import {
  convertToModelMessages,
  streamText,
  stepCountIs,
} from "ai";
import { type NextRequest } from "next/server";
import { createMarkdownTools } from "@/lib/ai/tools/edit-markdown";
import {
  getSkillByName,
  listAvailableSkills,
} from "@/lib/ai/tools/skills";
import { withOrganizationAuth } from "@/lib/auth/organization";
import { openrouter } from "@/lib/openrouter";
import { chatRequestSchema } from "@/utils/schemas/content";

interface RouteContext {
  params: Promise<{ organizationId: string; contentId: string }>;
}

export const maxDuration = 60;

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const { organizationId, contentId } = await params;
    console.log(`[Chat API] Request received for org=${organizationId}, content=${contentId}`);

    const auth = await withOrganizationAuth(request, organizationId);

    if (!auth.success) {
      console.log("[Chat API] Auth failed");
      return auth.response;
    }

    const body = await request.json();
    const parseResult = chatRequestSchema.safeParse(body);

    if (!parseResult.success) {
      console.log("[Chat API] Validation failed:", parseResult.error.issues);
      return new Response(
        JSON.stringify({ error: "Invalid request body", details: parseResult.error.issues }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { messages, currentMarkdown, selectedText, context } = parseResult.data;

    console.log(`[Chat API] Messages: ${messages.length}, Selected text: ${selectedText ? "yes" : "no"}, Context: ${context?.length ?? 0} items`);

    const modelWithMemory = withSupermemory(
      openrouter("anthropic/claude-sonnet-4.5"),
      organizationId
    );

    const { getMarkdown, editMarkdown } = createMarkdownTools({
      currentMarkdown,
      onUpdate: () => {},
    });

    const selectionContext = selectedText
      ? `\n\nThe user has selected the following text (focus changes on this area):\n"""\n${selectedText}\n"""`
      : "";

    const repoContext = context?.length
      ? `\n\nThe user has added the following GitHub repositories as context:\n${context.map(c => `- ${c.owner}/${c.repo}`).join("\n")}`
      : "";

    console.log("[Chat API] Starting streamText with claude-sonnet-4.5");

    const result = streamText({
      model: modelWithMemory,
      system: `You are a content editor assistant. Help users edit their markdown documents.

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
${selectionContext}${repoContext}`,
      messages: await convertToModelMessages(messages),
      tools: {
        getMarkdown,
        editMarkdown,
        listAvailableSkills: listAvailableSkills(),
        getSkillByName: getSkillByName(),
      },
      stopWhen: stepCountIs(15),
      onStepFinish: ({ toolCalls, toolResults, text }) => {
        if (toolCalls?.length) {
          console.log(`[Chat API] Tool calls: ${toolCalls.map(t => t.toolName).join(", ")}`);
        }
        if (toolResults?.length) {
          console.log(`[Chat API] Tool results received: ${toolResults.length}`);
        }
        if (text) {
          console.log(`[Chat API] Text response: ${text.slice(0, 100)}...`);
        }
      },
      onError: ({ error }) => {
        console.error("[Chat API] Stream error:", error);
      },
    });

    console.log("[Chat API] Returning stream response");
    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("[Chat API] Error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process chat request" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
