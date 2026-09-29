import { cn } from "cn";

import {
  Item,
  ItemContent,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";

import {
  CLAUDE_CODE_TODO_GLYPH_CLASSES,
  CLAUDE_CODE_TODO_GLYPHS,
  CLAUDE_CODE_TODO_LABEL_CLASSES,
  CLAUDE_CODE_TODO_STATUS_LABELS,
} from "../constants/claude-code";
import type { ClaudeCodeTodoListProps } from "../types/claude-code";

export const ClaudeCodeTodoList = ({
  className,
  heading = "Update Todos",
  todos,
  ...props
}: ClaudeCodeTodoListProps) => (
  <ItemGroup
    className={cn(
      "font-claude-code text-claude-code-fg gap-0 text-[0.8125rem] leading-[1.125rem]",
      className
    )}
    data-slot="claude-code-todo-list"
    {...props}
  >
    {heading ? (
      <div
        className="flex items-baseline gap-2"
        data-slot="claude-code-todo-title"
      >
        <span aria-hidden="true" className="text-claude-code-success">
          ⏺
        </span>
        <span className="text-claude-code-fg font-semibold">{heading}</span>
      </div>
    ) : null}
    {todos.map((todo, index) => (
      <Item
        className="flex-nowrap items-baseline gap-0 rounded-none border-0 p-0 text-[0.8125rem] leading-[1.125rem] whitespace-pre"
        data-status={todo.status}
        key={`${todo.label}-${todo.status}`}
        role="listitem"
      >
        <ItemMedia aria-hidden="true" className="gap-0">
          <span className="text-claude-code-muted">
            {index === 0 ? "  ⎿ " : "    "}
          </span>
          <span className={CLAUDE_CODE_TODO_GLYPH_CLASSES[todo.status]}>
            {CLAUDE_CODE_TODO_GLYPHS[todo.status]}{" "}
          </span>
        </ItemMedia>
        <ItemContent className="min-w-0 gap-0">
          <ItemTitle
            className={cn(
              "line-clamp-none block w-auto text-[0.8125rem] leading-[1.125rem] font-normal",
              CLAUDE_CODE_TODO_LABEL_CLASSES[todo.status]
            )}
          >
            {todo.label}
            <span className="sr-only">
              {" "}
              ({CLAUDE_CODE_TODO_STATUS_LABELS[todo.status]})
            </span>
          </ItemTitle>
        </ItemContent>
      </Item>
    ))}
  </ItemGroup>
);
