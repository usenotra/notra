import type { ReactNode } from "react";

const INLINE_TOKEN = /(`[^`]+`|\*\*[^*]+\*\*)/g;

/**
 * Renders the two bits of markdown Claude Code styles inline:
 * `code` in the link color and **bold** in bright white.
 */
export const renderClaudeCodeInline = (text: string): ReactNode[] => {
  let offset = 0;

  return text.split(INLINE_TOKEN).map((part) => {
    const key = `${offset}-${part}`;
    offset += part.length;

    if (part.length > 2 && part.startsWith("`") && part.endsWith("`")) {
      return (
        <code className="text-claude-code-link font-claude-code" key={key}>
          {part.slice(1, -1)}
        </code>
      );
    }

    if (part.length > 4 && part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong className="text-claude-code-strong font-bold" key={key}>
          {part.slice(2, -2)}
        </strong>
      );
    }

    return part;
  });
};

export const renderClaudeCodeChildren = (children: ReactNode): ReactNode =>
  typeof children === "string" ? renderClaudeCodeInline(children) : children;
