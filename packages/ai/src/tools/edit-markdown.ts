import {
  type EditOperation,
  editOperationSchema,
} from "@notra/ai/schemas/tools";
import type { EditMarkdownContext } from "@notra/ai/types/tools";
import { type Tool, tool } from "ai";
import z from "zod";

function getOperationLineNumber(op: EditOperation) {
  if ("line" in op && op.line !== undefined) {
    return op.line;
  }
  if ("startLine" in op && op.startLine !== undefined) {
    return op.startLine;
  }
  if ("afterLine" in op && op.afterLine !== undefined) {
    return op.afterLine;
  }
  return 0;
}

function applyOperation(lines: string[], op: EditOperation) {
  if (op.op === "replaceLine") {
    lines[op.line - 1] = op.content;
  } else if (op.op === "replaceRange") {
    const newLines = op.content.split("\n");
    lines.splice(op.startLine - 1, op.endLine - op.startLine + 1, ...newLines);
  } else if (op.op === "insert") {
    const newLines = op.content.split("\n");
    lines.splice(op.afterLine, 0, ...newLines);
  } else if (op.op === "deleteLine") {
    lines.splice(op.line - 1, 1);
  } else if (op.op === "deleteRange") {
    lines.splice(op.startLine - 1, op.endLine - op.startLine + 1);
  }
}

export function createMarkdownTools(context: EditMarkdownContext): {
  getMarkdown: Tool;
  editMarkdown: Tool;
} {
  const currentLines = context.currentMarkdown.split("\n");

  const getMarkdown = tool({
    description: "Gets the current markdown content with line numbers.",
    inputSchema: z.object({}),
    execute: () => {
      const numberedContent = currentLines
        .map((line, i) => `${i + 1}: ${line}`)
        .join("\n");
      console.log(`[getMarkdown] Returning ${currentLines.length} lines`);
      return { content: numberedContent, lineCount: currentLines.length };
    },
  });

  const editMarkdown = tool({
    description:
      "Edits markdown. Operations: replaceLine (line, content), replaceRange (startLine, endLine, content), insert (afterLine, content), deleteLine (line), deleteRange (startLine, endLine). Process from highest line number to lowest.",
    inputSchema: z.object({
      operations: z.array(editOperationSchema),
    }),
    execute: ({ operations }) => {
      try {
        console.log("[editMarkdown] Received:", JSON.stringify(operations));

        const previousMarkdown = currentLines.join("\n");
        const sortedOps = [...operations].sort(
          (a, b) => getOperationLineNumber(b) - getOperationLineNumber(a)
        );

        for (const op of sortedOps) {
          console.log(`[editMarkdown] Applying: ${op.op}`);
          applyOperation(currentLines, op);
        }

        const updatedMarkdown = currentLines.join("\n");
        context.onUpdate(updatedMarkdown);

        console.log(`[editMarkdown] Success. Lines: ${currentLines.length}`);
        return {
          success: true,
          lineCount: currentLines.length,
          filename: context.filename ?? "document.md",
          previousMarkdown,
          updatedMarkdown,
        };
      } catch (err) {
        console.error("[editMarkdown] Error:", err);
        return { success: false, error: String(err) };
      }
    },
  });

  return { getMarkdown, editMarkdown };
}
