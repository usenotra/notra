import { cn } from "cn";

import { CODEX_ROW_CLASS } from "../constants/codex";
import type { CodexReasoningProps } from "../types/codex";

export const CodexReasoning = ({
  children,
  className,
  ...props
}: CodexReasoningProps) => (
  <div
    className={cn(CODEX_ROW_CLASS, "text-codex-muted", className)}
    data-slot="codex-reasoning"
    {...props}
  >
    <span aria-hidden="true">•</span>
    <p className="min-w-0 font-bold wrap-break-word italic">{children}</p>
  </div>
);
