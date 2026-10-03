import { CODEX_COLORS, CODEX_ROW_CLASS } from "@notra/ui/constants/codex-skin";
import { cn } from "@notra/ui/lib/utils";
import type { CodexMessageProps } from "@notra/ui/types/codex-skin";

export function CodexMessage({
  from: author = "assistant",
  className,
  children,
}: CodexMessageProps) {
  if (author === "user") {
    return (
      <div
        className={cn(CODEX_ROW_CLASS, "w-full py-[1.3em]", className)}
        style={{ backgroundColor: CODEX_COLORS.band, color: CODEX_COLORS.foreground }}
      >
        <span aria-hidden="true" style={{ color: CODEX_COLORS.dim }}>
          ›
        </span>
        <div className="min-w-0 wrap-break-word whitespace-pre-wrap">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(CODEX_ROW_CLASS, "w-full", className)}
      style={{ color: CODEX_COLORS.foreground }}
    >
      <span aria-hidden="true" style={{ color: CODEX_COLORS.muted }}>
        •
      </span>
      <div className="min-w-0 wrap-break-word">{children}</div>
    </div>
  );
}
