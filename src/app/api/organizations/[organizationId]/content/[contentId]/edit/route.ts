import { generateText } from "ai";
import { type NextRequest, NextResponse } from "next/server";
import { getContentEditorPrompt } from "@/lib/ai/prompts/content-editor";
import { withOrganizationAuth } from "@/lib/auth/organization";
import { openrouter } from "@/lib/openrouter";
import { editContentSchema } from "@/utils/schemas/content";

const JSON_ARRAY_REGEX = /\[[\s\S]*\]/;

interface RouteContext {
  params: Promise<{ organizationId: string; contentId: string }>;
}

interface EditOperation {
  op: "replace" | "insert" | "delete";
  line?: number;
  startLine?: number;
  endLine?: number;
  afterLine?: number;
  content?: string;
}

function applyReplaceOp(lines: string[], op: EditOperation): void {
  if (op.line !== undefined) {
    lines[op.line - 1] = op.content ?? "";
  } else if (op.startLine !== undefined && op.endLine !== undefined) {
    const newLines = (op.content ?? "").split("\n");
    lines.splice(op.startLine - 1, op.endLine - op.startLine + 1, ...newLines);
  }
}

function applyInsertOp(lines: string[], op: EditOperation): void {
  if (op.afterLine !== undefined) {
    const newLines = (op.content ?? "").split("\n");
    lines.splice(op.afterLine, 0, ...newLines);
  }
}

function applyDeleteOp(lines: string[], op: EditOperation): void {
  if (op.line !== undefined) {
    lines.splice(op.line - 1, 1);
  } else if (op.startLine !== undefined && op.endLine !== undefined) {
    lines.splice(op.startLine - 1, op.endLine - op.startLine + 1);
  }
}

function applyOperations(
  markdown: string,
  operations: EditOperation[]
): string {
  const lines = markdown.split("\n");

  const sortedOps = [...operations].sort((a, b) => {
    const lineA = a.line ?? a.startLine ?? a.afterLine ?? 0;
    const lineB = b.line ?? b.startLine ?? b.afterLine ?? 0;
    return lineB - lineA;
  });

  for (const op of sortedOps) {
    if (op.op === "replace") {
      applyReplaceOp(lines, op);
    } else if (op.op === "insert") {
      applyInsertOp(lines, op);
    } else if (op.op === "delete") {
      applyDeleteOp(lines, op);
    }
  }

  return lines.join("\n");
}

export const maxDuration = 30;

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const { organizationId } = await params;
    const auth = await withOrganizationAuth(request, organizationId);

    if (!auth.success) {
      return auth.response;
    }

    const body = await request.json();
    const validationResult = editContentSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const { instruction, currentMarkdown, selectedText } =
      validationResult.data;

    const prompt = getContentEditorPrompt({
      instruction,
      currentMarkdown,
      selectedText,
    });

    const result = await generateText({
      model: openrouter("google/gemini-2.0-flash-001"),
      prompt,
    });

    let operations: EditOperation[];
    try {
      const jsonMatch = result.text.match(JSON_ARRAY_REGEX);
      if (!jsonMatch) {
        throw new Error("No JSON array found in response");
      }
      operations = JSON.parse(jsonMatch[0]);
    } catch {
      return NextResponse.json(
        { error: "Failed to parse AI response" },
        { status: 500 }
      );
    }

    const updatedMarkdown = applyOperations(currentMarkdown, operations);

    return NextResponse.json({
      markdown: updatedMarkdown,
      operations,
    });
  } catch (error) {
    console.error("Error editing content:", error);
    return NextResponse.json(
      { error: "Failed to edit content" },
      { status: 500 }
    );
  }
}
