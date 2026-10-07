import {
  CODEX_COLORS,
  CODEX_DEFAULT_CWD,
  CODEX_DEFAULT_GREETING,
  CODEX_DEFAULT_VERSION,
  CODEX_ROW_CLASS,
} from "@notra/ui/constants/codex-skin";
import { cn } from "@notra/ui/lib/utils";
import type { CodexHeaderProps } from "@notra/ui/types/codex-skin";

export function CodexHeader({
  version = CODEX_DEFAULT_VERSION,
  cwd = CODEX_DEFAULT_CWD,
  greeting = CODEX_DEFAULT_GREETING,
  className,
}: CodexHeaderProps) {
  return (
    <div
      className={cn(CODEX_ROW_CLASS, className)}
      style={{ color: CODEX_COLORS.foreground }}
    >
      <p className="col-start-2 min-w-0 wrap-break-word">
        <span style={{ color: CODEX_COLORS.blue }}>&gt;_ </span>
        <span className="font-bold">OpenAI Codex</span>
        <span style={{ color: CODEX_COLORS.muted }}> (v{version})</span>
      </p>
      <p
        className="col-start-2 min-w-0 truncate pl-[3ch]"
        style={{ color: CODEX_COLORS.muted }}
      >
        {cwd}
      </p>
      {greeting ? (
        <p
          className="col-start-2 mt-[1.3em] min-w-0 wrap-break-word"
          style={{ color: CODEX_COLORS.blue }}
        >
          {greeting}
        </p>
      ) : null}
    </div>
  );
}
