import { tool } from "ai";
// biome-ignore lint/performance/noNamespaceImport: Zod recommended way to import
import * as z from "zod";
import { toolDescription } from "../utils/description";

const replaceLineOperationSchema = z
  .object({
    op: z.literal("replace"),
    line: z.number().int().describe("The line number to replace (1-indexed)"),
    content: z.string().describe("The new content for the line"),
  })
  .strict();

const replaceRangeOperationSchema = z
  .object({
    op: z.literal("replace"),
    startLine: z
      .number()
      .int()
      .describe("The starting line number of the range (1-indexed)"),
    endLine: z
      .number()
      .int()
      .describe("The ending line number of the range (1-indexed)"),
    content: z
      .string()
      .describe("The new content (use \\n for multiple lines)"),
  })
  .strict();

const insertOperationSchema = z
  .object({
    op: z.literal("insert"),
    afterLine: z
      .number()
      .int()
      .describe("The line number after which to insert (0 for start)"),
    content: z.string().describe("The content to insert"),
  })
  .strict();

const deleteLineOperationSchema = z
  .object({
    op: z.literal("delete"),
    line: z.number().int().describe("The line number to delete (1-indexed)"),
  })
  .strict();

const deleteRangeOperationSchema = z
  .object({
    op: z.literal("delete"),
    startLine: z
      .number()
      .int()
      .describe("The starting line number to delete (1-indexed)"),
    endLine: z
      .number()
      .int()
      .describe("The ending line number to delete (1-indexed)"),
  })
  .strict();

const editOperationSchema = z.union([
  replaceLineOperationSchema,
  replaceRangeOperationSchema,
  insertOperationSchema,
  deleteLineOperationSchema,
  deleteRangeOperationSchema,
]);

export type EditOperation = z.infer<typeof editOperationSchema>;

interface EditMarkdownContext {
  getMarkdown: () => string;
  setMarkdown: (markdown: string) => void;
}

function getOperationSortKey(op: EditOperation): number {
  if ("endLine" in op && op.endLine !== undefined) {
    return op.endLine;
  }
  if ("line" in op && op.line !== undefined) {
    return op.line;
  }
  if ("afterLine" in op && op.afterLine !== undefined) {
    return op.afterLine;
  }
  if ("startLine" in op && op.startLine !== undefined) {
    return op.startLine;
  }
  return 0;
}

function validateLineInDocument(line: number, lineCount: number): string | null {
  if (lineCount === 0) {
    return "Document is empty.";
  }
  if (line < 1 || line > lineCount) {
    return `Line ${line} is out of range (1-${lineCount}).`;
  }
  return null;
}

function validateRangeInDocument(
  startLine: number,
  endLine: number,
  lineCount: number
): string | null {
  if (startLine > endLine) {
    return `Invalid range: startLine (${startLine}) is greater than endLine (${endLine}).`;
  }
  const startError = validateLineInDocument(startLine, lineCount);
  if (startError) {
    return startError;
  }
  const endError = validateLineInDocument(endLine, lineCount);
  if (endError) {
    return endError;
  }
  return null;
}

function applyOperation(lines: string[], op: EditOperation): string | null {
  const lineCount = lines.length;

  if (op.op === "replace") {
    if ("line" in op) {
      const error = validateLineInDocument(op.line, lineCount);
      if (error) {
        return error;
      }

      lines[op.line - 1] = op.content;
      return null;
    }

    const error = validateRangeInDocument(op.startLine, op.endLine, lineCount);
    if (error) {
      return error;
    }

    const newLines = op.content.split("\n");
    lines.splice(op.startLine - 1, op.endLine - op.startLine + 1, ...newLines);
    return null;
  }

  if (op.op === "insert") {
    if (op.afterLine < 0 || op.afterLine > lineCount) {
      return `afterLine ${op.afterLine} is out of range (0-${lineCount}).`;
    }

    const newLines = op.content.split("\n");
    lines.splice(op.afterLine, 0, ...newLines);
    return null;
  }

  if (op.op === "delete") {
    if ("line" in op) {
      const error = validateLineInDocument(op.line, lineCount);
      if (error) {
        return error;
      }

      lines.splice(op.line - 1, 1);
      return null;
    }

    const error = validateRangeInDocument(op.startLine, op.endLine, lineCount);
    if (error) {
      return error;
    }

    lines.splice(op.startLine - 1, op.endLine - op.startLine + 1);
    return null;
  }

  return "Unsupported operation.";
}

export function createEditMarkdownTool(context: EditMarkdownContext) {
  return tool({
    description: toolDescription({
      toolName: "editMarkdown",
      intro:
        "Edits markdown content by applying operations like replace, insert, and delete. Supports single line and range operations.",
      whenToUse:
        "When user wants to modify specific parts of a markdown document, add new content, remove sections, or update existing text.",
      usageNotes: `Always call getMarkdown first to see current line numbers before editing.
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
      const lines = context.getMarkdown().split("\n");

      const sortedOps = [...operations].sort(
        (a, b) => getOperationSortKey(b) - getOperationSortKey(a)
      );

      for (const op of sortedOps) {
        const error = applyOperation(lines, op);
        if (error) {
          return {
            success: false,
            error,
            lineCount: lines.length,
          };
        }
      }

      const updatedMarkdown = lines.join("\n");
      context.setMarkdown(updatedMarkdown);

      return {
        success: true,
        lineCount: lines.length,
        preview: `${lines.slice(0, 10).join("\n")}\n...`,
      };
    },
  });
}

export function createGetMarkdownTool(context: EditMarkdownContext) {
  return tool({
    description: toolDescription({
      toolName: "getMarkdown",
      intro:
        "Gets the current markdown content with line numbers. Shows the full document structure with each line numbered.",
      whenToUse:
        "Before making any edits to understand the document structure and get accurate line numbers for edit operations.",
      whenNotToUse:
        "If you already have the current line numbers from a recent call and no edits were made since.",
    }),
    inputSchema: z.object({}),
    execute: () => {
      const lines = context.getMarkdown().split("\n");
      const numberedContent = lines.map((line, i) => `${i + 1}: ${line}`).join("\n");

      return {
        content: numberedContent,
        lineCount: lines.length,
      };
    },
  });
}
