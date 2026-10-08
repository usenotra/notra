import { chatTodoListSchema } from "@notra/ai/schemas/todos";
import { toolDescription } from "@notra/ai/utils/description";
import { type Tool, tool } from "ai";

export const UPDATE_TODOS_TOOL_NAME = "updateTodos";

/** Plan writes allowed per reply: the plan plus one update per deliverable. */
export const UPDATE_TODOS_MAX_CALLS = 6;

/**
 * A plan the model keeps for long, multi-deliverable requests. It stores
 * nothing: the list lives in the tool call, and the chat renders the latest
 * accepted one as a checklist. Built per request; the caller passes the
 * calls the reply already made so the cap holds across approvals.
 */
export function createUpdateTodosTool(previousCalls = 0): Tool {
  // Approvals resume a reply in a new request, so earlier calls count too.
  let calls = previousCalls;

  return tool({
    description: toolDescription({
      toolName: UPDATE_TODOS_TOOL_NAME,
      intro:
        "Shows your plan as a short checklist the user can follow while you work.",
      whenToUse:
        "Only when one request asks for four or more separate pieces of content, for example posts about several features plus social posts. Never for one to three posts, a revision, research, or a question.",
      usageNotes: `Send the full list every call. Call it once with the plan before starting. After that, call it only when a piece of content is saved: mark it completed and the next one in_progress in the same call. Do not call it for research or other intermediate steps, and never twice in a row. At most ${UPDATE_TODOS_MAX_CALLS} calls per reply.`,
    }),
    inputSchema: chatTodoListSchema,
    execute: ({ todos }) => {
      calls += 1;
      if (calls > UPDATE_TODOS_MAX_CALLS) {
        return {
          accepted: false as const,
          error:
            "Plan update limit reached for this reply. Continue the work without updating the plan.",
        };
      }
      return {
        accepted: true as const,
        remaining: todos.filter((todo) => todo.status !== "completed").length,
      };
    },
  });
}
