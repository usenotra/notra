import type { ChatTodoItem } from "@notra/ai/types/todos";

export interface ChatTodoListProps {
  todos: ChatTodoItem[];
  /** Whether the reply is still running, so in-progress items spin. */
  isActive: boolean;
  /** The reply was stopped mid-plan: the running step shows where it ended. */
  isStopped?: boolean;
}
