import { withSupermemory } from "@supermemory/tools/ai-sdk";
import {
  convertToModelMessages,
  streamText,
  stepCountIs,
} from "ai";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getContentEditorChatPrompt } from "@/lib/ai/prompts/content-editor";
import { createMarkdownTools } from "@/lib/ai/tools/edit-markdown";
import {
  getSkillByName,
  listAvailableSkills,
} from "@/lib/ai/tools/skills";
import { withOrganizationAuth } from "@/lib/auth/organization";
import { openrouter } from "@/lib/openrouter";

interface RouteContext {
  params: Promise<{ organizationId: string }>;
}

const debugChatRequestSchema = z.object({
  messages: z.array(z.any()),
  currentMarkdown: z.string(),
  selection: z
    .object({
      text: z.string(),
      startLine: z.number(),
      startChar: z.number(),
      endLine: z.number(),
      endChar: z.number(),
    })
    .optional(),
  context: z
    .array(
      z.object({
        type: z.literal("github-repo"),
        owner: z.string(),
        repo: z.string(),
        integrationId: z.string(),
      })
    )
    .optional(),
});

export const maxDuration = 60;

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const { organizationId } = await params;

    const auth = await withOrganizationAuth(request, organizationId);

    if (!auth.success) {
      return auth.response;
    }

    const body = await request.json();
    const parseResult = debugChatRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parseResult.error.issues },
        { status: 400 }
      );
    }

    const { messages, currentMarkdown, selection, context } = parseResult.data;

    const modelWithMemory = withSupermemory(
      openrouter("anthropic/claude-sonnet-4.5"),
      organizationId
    );

    const { getMarkdown, editMarkdown } = createMarkdownTools({
      currentMarkdown,
      onUpdate: () => {},
    });

    const result = streamText({
      model: modelWithMemory,
      system: getContentEditorChatPrompt({
        selection,
        repoContext: context,
      }),
      messages: await convertToModelMessages(messages),
      tools: {
        getMarkdown,
        editMarkdown,
        listAvailableSkills: listAvailableSkills(),
        getSkillByName: getSkillByName(),
      },
      // Allow more steps for complex debugging
      stopWhen: stepCountIs(5),
    });

    return result.toUIMessageStreamResponse();
  } catch (e) {
    console.error("AI Debug chat error:", e);
    return NextResponse.json(
      { error: "Failed to process chat request" },
      { status: 500 }
    );
  }
}
