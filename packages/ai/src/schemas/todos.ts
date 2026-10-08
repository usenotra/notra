// biome-ignore lint/performance/noNamespaceImport: Zod recommended way to import
import * as z from "zod";

export const CHAT_TODO_MAX_ITEMS = 12;

export const chatTodoStatusSchema = z.enum([
  "pending",
  "in_progress",
  "completed",
]);

export const chatTodoItemSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1)
    .max(160)
    .describe(
      "One short, concrete step, e.g. 'Research the bulk export feature'"
    ),
  status: chatTodoStatusSchema.describe(
    "pending, in_progress (at most one at a time), or completed"
  ),
});

export const chatTodoListSchema = z.object({
  todos: z
    .array(chatTodoItemSchema)
    .min(1)
    .max(CHAT_TODO_MAX_ITEMS)
    .describe("The full plan. Send every item each time, not just changes."),
});
