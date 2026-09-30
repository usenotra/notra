import type { ReactNode } from "react";

const INLINE_TOKEN = /(`[^`]+`|\*\*[^*]+\*\*)/g;

/** Styles `code` in lavender and **bold** in bright white, like Claude Code. */
export function renderClaudeCodeInline(text: string): ReactNode[] {
  let offset = 0;
  return text.split(INLINE_TOKEN).map((part) => {
    const key = `${offset}-${part}`;
    offset += part.length;
    if (part.length > 2 && part.startsWith("`") && part.endsWith("`")) {
      return (
        <code className="font-mono text-[#a4b0fc]" key={key}>
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.length > 4 && part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong className="font-bold text-white" key={key}>
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}
