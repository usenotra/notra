import { cn } from "cn";

import {
  CLAUDE_CODE_RESULT_GLYPH,
  CLAUDE_CODE_TODOS,
} from "../constants/claude-code";
import type { ClaudeCodeTodoListProps } from "../types/claude-code";

export const ClaudeCodeTodoList = ({
  className,
  heading = "Update Todos",
  todos,
  ...props
}: ClaudeCodeTodoListProps) => (
  <div
    className={cn(
      "font-claude-code text-claude-code-fg flex min-w-0 flex-col text-[0.8125rem] leading-5",
      className
    )}
    data-slot="claude-code-todo-list"
    {...props}
  >
    {heading !== null && (
      <p className="grid grid-cols-[2ch_minmax(0,1fr)]">
        <span aria-hidden="true" className="text-claude-code-success">
          ●
        </span>
        <span className="text-claude-code-strong font-bold">{heading}</span>
      </p>
    )}
    <ul className="flex min-w-0 flex-col pl-[2ch]">
      {todos.map((todo, index) => {
        const config = CLAUDE_CODE_TODOS[todo.status];

        return (
          <li
            className="grid grid-cols-[3ch_2ch_minmax(0,1fr)]"
            data-status={todo.status}
            key={todo.label}
          >
            <span aria-hidden="true" className="text-claude-code-muted">
              {index === 0 && heading !== null ? CLAUDE_CODE_RESULT_GLYPH : ""}
            </span>
            <span
              aria-hidden="true"
              className={cn(
                "text-center",
                todo.status === "done"
                  ? "text-claude-code-muted"
                  : "text-claude-code-fg"
              )}
            >
              {config.glyph}
            </span>
            <span className={cn("min-w-0 pl-[1ch]", config.labelClassName)}>
              <span className="sr-only">{config.srLabel}: </span>
              {todo.label}
            </span>
          </li>
        );
      })}
    </ul>
  </div>
);
