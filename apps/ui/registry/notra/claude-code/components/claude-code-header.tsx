import { cn } from "cn";

import { CLAUDE_CODE_RESULT_GLYPH } from "../constants/claude-code";
import { renderClaudeCodeInline } from "../lib/claude-code-inline";
import type { ClaudeCodeHeaderProps } from "../types/claude-code";
import { ClaudeCodeLogo } from "./claude-code-logo";

export const ClaudeCodeHeader = ({
  className,
  cwd = "~/",
  model,
  org,
  tips = [],
  version = "v2.1.0",
  whatsNew = [],
  ...props
}: ClaudeCodeHeaderProps) => {
  const plan = [model, org].filter(Boolean).join(" · ");
  const hasNotices = whatsNew.length > 0 || tips.length > 0;

  return (
    <div
      className={cn(
        "font-claude-code text-claude-code-fg flex min-w-0 flex-col gap-5 text-[0.8125rem] leading-5",
        className
      )}
      data-slot="claude-code-header"
      {...props}
    >
      <div className="flex min-w-0 items-center gap-[2ch]">
        <ClaudeCodeLogo className="text-claude-code-accent shrink-0" />
        <div className="flex min-w-0 flex-col">
          <p className="truncate">
            <span className="text-claude-code-strong font-bold">
              Claude Code
            </span>{" "}
            <span className="text-claude-code-muted">{version}</span>
          </p>
          {plan && <p className="text-claude-code-muted truncate">{plan}</p>}
          {cwd && <p className="text-claude-code-muted truncate">{cwd}</p>}
        </div>
      </div>
      {hasNotices && (
        <div className="flex min-w-0 flex-col pl-[2ch]">
          {whatsNew.map((line) => (
            <p key={line}>{renderClaudeCodeInline(line)}</p>
          ))}
          {tips.map((line) => (
            <p className="text-claude-code-muted flex gap-[2ch]" key={line}>
              <span aria-hidden="true" className="shrink-0">
                {CLAUDE_CODE_RESULT_GLYPH}
              </span>
              <span className="min-w-0">{renderClaudeCodeInline(line)}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
};
