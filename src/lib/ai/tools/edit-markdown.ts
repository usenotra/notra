import { tool } from "ai";
// biome-ignore lint/performance/noNamespaceImport: Zod recommended way to import
import * as z from "zod";
import { toolDescription } from "../utils/description";

const editOperationSchema = z.discriminatedUnion("op", [
  z.object({
    op: z.literal("replace"),
    line: z.number().describe("The line number to replace (1-indexed)"),
    content: z.string().describe("The new content for the line"),
  }),
  z.object({
    op: z.literal("replace"),
    startLine: z
      .number()
      .describe("The starting line number of the range (1-indexed)"),
    endLine: z
      .number()
      .describe("The ending line number of the range (1-indexed)"),
    content: z
      .string()
      .describe("The new content (use \\n for multiple lines)"),
  }),
  z.object({
    op: z.literal("insert"),
    afterLine: z
      .number()
      .describe("The line number after which to insert (0 for start)"),
    content: z.string().describe("The content to insert"),
  }),
  z.object({
    op: z.literal("delete"),
    line: z.number().describe("The line number to delete (1-indexed)"),
  }),
  z.object({
    op: z.literal("delete"),
    startLine: z
      .number()
      .describe("The starting line number to delete (1-indexed)"),
    endLine: z
      .number()
      .describe("The ending line number to delete (1-indexed)"),
  }),
]);

export type EditOperation = z.infer<typeof editOperationSchema>;

interface EditMarkdownContext {
  currentMarkdown: string;
  onUpdate: (markdown: string) => void;
}

function splitMarkdownLines(markdown: string): string[] {
  return markdown.split(/\r?\n/);
}

function getOperationSortKey(op: EditOperation): number {
  if ("line" in op && op.line !== undefined) {
    return op.line;
  }
  if ("endLine" in op && op.endLine !== undefined) {
    return op.endLine;
  }
  if ("startLine" in op && op.startLine !== undefined) {
    return op.startLine;
  }
  if ("afterLine" in op && op.afterLine !== undefined) {
    // Inserting after line N affects subsequent lines.
    return op.afterLine;
  }
  return 0;
}

function applyOperation(lines: string[], op: EditOperation): { ok: true } | { ok: false; error: string } {
  if (op.op === "replace") {
    if ("line" in op && op.line !== undefined) {
      if (op.line < 1 || op.line > lines.length) {
        return {
          ok: false,
          error: `Replace line ${op.line} out of bounds (1-${lines.length})`,
        };
      }
      lines[op.line - 1] = op.content;
      return { ok: true };
    }

    if ("startLine" in op && "endLine" in op) {
      if (op.startLine < 1 || op.endLine < 1 || op.startLine > op.endLine) {
        return {
          ok: false,
          error: `Replace range invalid (${op.startLine}-${op.endLine})`,
        };
      }
      if (op.endLine > lines.length) {
        return {
          ok: false,
          error: `Replace range ${op.startLine}-${op.endLine} out of bounds (1-${lines.length})`,
        };
      }

      const newLines = splitMarkdownLines(op.content);
      lines.splice(op.startLine - 1, op.endLine - op.startLine + 1, ...newLines);
      return { ok: true };
    }

    return { ok: false, error: "Replace operation missing line or range" };
  }

  if (op.op === "insert" && "afterLine" in op) {
    if (op.afterLine < 0 || op.afterLine > lines.length) {
      return {
        ok: false,
        error: `Insert afterLine ${op.afterLine} out of bounds (0-${lines.length})`,
      };
    }

    const newLines = splitMarkdownLines(op.content);
    lines.splice(op.afterLine, 0, ...newLines);
    return { ok: true };
  }

  if (op.op === "delete") {
    if ("line" in op && op.line !== undefined) {
      if (op.line < 1 || op.line > lines.length) {
        return {
          ok: false,
          error: `Delete line ${op.line} out of bounds (1-${lines.length})`,
        };
      }
      lines.splice(op.line - 1, 1);
      return { ok: true };
    }

    if ("startLine" in op && "endLine" in op) {
      if (op.startLine < 1 || op.endLine < 1 || op.startLine > op.endLine) {
        return {
          ok: false,
          error: `Delete range invalid (${op.startLine}-${op.endLine})`,
        };
      }
      if (op.endLine > lines.length) {
        return {
          ok: false,
          error: `Delete range ${op.startLine}-${op.endLine} out of bounds (1-${lines.length})`,
        };
      }
      lines.splice(op.startLine - 1, op.endLine - op.startLine + 1);
      return { ok: true };
    }

    return { ok: false, error: "Delete operation missing line or range" };
  }

  return { ok: false, error: "Unknown operation" };
}

export function createEditMarkdownTool(context: EditMarkdownContext) {
  return tool({
    description: toolDescription({
      toolName: "edit_markdown",
      intro:
        "Edits markdown content by applying operations like replace, insert, and delete. Supports single line and range operations.",
      whenToUse:
        "When user wants to modify specific parts of a markdown document, add new content, remove sections, or update existing text.",
      usageNotes: `Always call get_markdown first to see current line numbers before editing.
Process operations from highest line number to lowest to maintain accuracy.
Supports: replace (single line or range), insert (after a line), delete (single line or range).`,
    }),
    inputSchema: z.object({
      operations: z
        .array(editOperationSchema)
        .describe(
          "Array of edit operations to apply. Process from highest line number to lowest."
        ),
    }),
    execute: ({ operations }) => {
      const baseLines = splitMarkdownLines(context.currentMarkdown);
      const workingLines = [...baseLines];
      const sortedOps = [...operations].sort(
        (a, b) => getOperationSortKey(b) - getOperationSortKey(a)
      );

      const errors: string[] = [];
      for (const op of sortedOps) {
        const result = applyOperation(workingLines, op);
        if (!result.ok) {
          errors.push(result.error);
        }
      }

      if (errors.length > 0) {
        return {
          success: false,
          errors,
          lineCount: baseLines.length,
          preview: `${baseLines.slice(0, 10).join("\n")}\n...`,
        };
      }

      const updatedMarkdown = workingLines.join("\n");
      context.currentMarkdown = updatedMarkdown;
      context.onUpdate(updatedMarkdown);

      return {
        success: true,
        lineCount: workingLines.length,
        preview: `${workingLines.slice(0, 10).join("\n")}\n...`,
      };
    },
  });
}

export function createGetMarkdownTool(context: EditMarkdownContext) {
  return tool({
    description: toolDescription({
      toolName: "get_markdown",
      intro:
        "Gets the current markdown content with line numbers. Shows the full document structure with each line numbered.",
      whenToUse:
        "Before making any edits to understand the document structure and get accurate line numbers for edit operations.",
      whenNotToUse:
        "If you already have the current line numbers from a recent call and no edits were made since.",
    }),
    inputSchema: z.object({}),
    execute: () => {
      const lines = splitMarkdownLines(context.currentMarkdown);
      const numberedContent = lines
        .map((line, i) => `${i + 1}: ${line}`)
        .join("\n");

      return {
        content: numberedContent,
        lineCount: lines.length,
      };
    },
  });
}
