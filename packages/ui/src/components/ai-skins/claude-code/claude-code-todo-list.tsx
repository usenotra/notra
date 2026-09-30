import { cn } from "@notra/ui/lib/utils";

export type ClaudeCodeTodoStatus = "done" | "active" | "todo";

export type ClaudeCodeTodo = {
  label: string;
  status: ClaudeCodeTodoStatus;
};

const TODO_STYLE: Record<
  ClaudeCodeTodoStatus,
  { glyph: string; glyphClassName: string; labelClassName: string; srLabel: string }
> = {
  done: {
    glyph: "☒",
    glyphClassName: "text-[#8c8c8c]",
    labelClassName: "text-[#8c8c8c] line-through",
    srLabel: "Done",
  },
  active: {
    glyph: "☐",
    glyphClassName: "text-[#f7f7f7]",
    labelClassName: "font-bold text-white",
    srLabel: "In progress",
  },
  todo: {
    glyph: "☐",
    glyphClassName: "text-[#f7f7f7]",
    labelClassName: "text-[#f7f7f7]",
    srLabel: "To do",
  },
};

export function ClaudeCodeTodoList({
  todos,
  heading = "Update Todos",
  className,
}: {
  todos: ClaudeCodeTodo[];
  /** The tool line above the list. Pass `null` to leave it out. */
  heading?: string | null;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col font-mono text-[13px] leading-5 text-[#f7f7f7]",
        className
      )}
    >
      {heading === null ? null : (
        <p className="grid grid-cols-[2ch_minmax(0,1fr)]">
          <span aria-hidden="true" className="text-[#4eba65]">
            ●
          </span>
          <span className="font-bold text-white">{heading}</span>
        </p>
      )}
      <ul className="flex min-w-0 flex-col pl-[2ch]">
        {todos.map((todo, index) => {
          const style = TODO_STYLE[todo.status];
          return (
            <li
              className="grid grid-cols-[3ch_2ch_minmax(0,1fr)]"
              key={todo.label}
            >
              <span aria-hidden="true" className="text-[#8c8c8c]">
                {index === 0 && heading !== null ? "⎿" : ""}
              </span>
              <span
                aria-hidden="true"
                className={cn("text-center", style.glyphClassName)}
              >
                {style.glyph}
              </span>
              <span className={cn("min-w-0 pl-[1ch]", style.labelClassName)}>
                <span className="sr-only">{style.srLabel}: </span>
                {todo.label}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
