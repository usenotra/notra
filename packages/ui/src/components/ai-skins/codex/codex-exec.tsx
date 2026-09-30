import {
  CODEX_COLORS,
  CODEX_EXEC_BULLET_COLOR,
  CODEX_EXEC_LABEL,
  CODEX_EXEC_PREVIEW_LINES,
  CODEX_ROW_CLASS,
} from "@notra/ui/constants/codex-skin";
import { tokenizeShellCommand } from "@notra/ui/lib/codex-shell";
import { cn } from "@notra/ui/lib/utils";
import type {
  CodexExecProps,
  CodexShellTokenKind,
} from "@notra/ui/types/codex-skin";

const SHELL_TOKEN_COLOR: Record<CodexShellTokenKind, string | undefined> = {
  command: CODEX_COLORS.command,
  flag: CODEX_COLORS.flag,
  string: CODEX_COLORS.green,
  operator: CODEX_COLORS.operator,
  argument: CODEX_COLORS.argument,
  space: undefined,
};

export function CodexShellCommand({ command }: { command: string }) {
  return (
    <>
      {tokenizeShellCommand(command).map((token, index) => (
        <span
          // Tokens are positional; the command string never reorders.
          // oxlint-disable-next-line react/no-array-index-key
          key={index}
          style={{ color: SHELL_TOKEN_COLOR[token.kind] }}
        >
          {token.text}
        </span>
      ))}
    </>
  );
}

export function CodexExec({
  command,
  output,
  status = "ran",
  maxLines = CODEX_EXEC_PREVIEW_LINES,
  moreLines = 0,
  className,
}: CodexExecProps) {
  const lines = output ? output.split("\n") : [];
  const visible = lines.slice(0, maxLines);
  const hidden = lines.length - visible.length + moreLines;

  return (
    <div
      className={cn(CODEX_ROW_CLASS, className)}
      data-status={status}
      style={{ color: CODEX_COLORS.foreground }}
    >
      <span
        aria-hidden="true"
        className={status === "running" ? "animate-pulse" : undefined}
        style={{ color: CODEX_EXEC_BULLET_COLOR[status] }}
      >
        •
      </span>
      <p className="min-w-0 truncate">
        <span className="font-bold">{CODEX_EXEC_LABEL[status]}</span>{" "}
        <CodexShellCommand command={command} />
      </p>
      {visible.length > 0 || hidden > 0 ? (
        <div
          className="col-start-2 grid min-w-0 grid-cols-[2ch_minmax(0,1fr)]"
          style={{ color: CODEX_COLORS.muted }}
        >
          <span aria-hidden="true">└</span>
          <pre className="min-w-0 font-[inherit] whitespace-pre-wrap">
            {visible.join("\n")}
          </pre>
          {hidden > 0 ? (
            <span className="col-start-2">
              + {hidden} lines (ctrl+t to expand)
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
