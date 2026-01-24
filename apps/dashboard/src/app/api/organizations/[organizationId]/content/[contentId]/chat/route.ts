import { withSupermemory } from "@supermemory/tools/ai-sdk";
import {
  convertToModelMessages,
  streamText,
  stepCountIs,
} from "ai";
import type { NextRequest } from "next/server";
import { getContentEditorChatPrompt } from "@/lib/ai/prompts/content-editor";
import { createMarkdownTools } from "@/lib/ai/tools/edit-markdown";
import {
  getSkillByName,
  listAvailableSkills,
} from "@/lib/ai/tools/skills";
import { withOrganizationAuth } from "@/lib/auth/organization";
import { openrouter } from "@/lib/openrouter";
import { chatRequestSchema } from "@/utils/schemas/content";
import { NextResponse } from "next/server";

interface RouteContext {
  params: Promise<{ organizationId: string; contentId: string }>;
}

export const maxDuration = 60;

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const { organizationId } = await params;

    const auth = await withOrganizationAuth(request, organizationId);

    if (!auth.success) {
      return auth.response;
    }

    const body = await request.json();
    const parseResult = chatRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parseResult.error.issues },
        { status: 400 }
      );
    }

    const { messages, currentMarkdown, selectedText, context } = parseResult.data;

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
        selectedText,
        repoContext: context,
      }),
      messages: await convertToModelMessages(messages),
      tools: {
        getMarkdown,
        editMarkdown,
        listAvailableSkills: listAvailableSkills(),
        getSkillByName: getSkillByName(),
      },
      stopWhen: stepCountIs(1),
    });

    return result.toUIMessageStreamResponse();
  } catch (_e) {
    return NextResponse.json(
      { error: "Failed to process chat request" },
      { status: 500 }
    );
  }
}
