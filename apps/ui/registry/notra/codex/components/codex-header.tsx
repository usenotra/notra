import { cn } from "cn";

import {
  CODEX_DEFAULT_CWD,
  CODEX_DEFAULT_GREETING,
  CODEX_DEFAULT_VERSION,
  CODEX_ROW_CLASS,
} from "../constants/codex";
import type { CodexHeaderProps } from "../types/codex";

export const CodexHeader = ({
  className,
  cwd = CODEX_DEFAULT_CWD,
  greeting = CODEX_DEFAULT_GREETING,
  version = CODEX_DEFAULT_VERSION,
  ...props
}: CodexHeaderProps) => (
  <div
    className={cn(CODEX_ROW_CLASS, "text-codex-fg", className)}
    data-slot="codex-header"
    {...props}
  >
    <p className="col-start-2 min-w-0 wrap-break-word">
      <span className="text-codex-blue">&gt;_ </span>
      <span className="font-bold">OpenAI Codex</span>
      <span className="text-codex-muted"> (v{version})</span>
    </p>
    <p className="text-codex-muted col-start-2 min-w-0 truncate ps-[3ch]">
      {cwd}
    </p>
    {greeting && (
      <p className="text-codex-blue col-start-2 mt-[1.3em] min-w-0 wrap-break-word">
        {greeting}
      </p>
    )}
  </div>
);
