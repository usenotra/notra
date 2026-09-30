"use client";

import { cn } from "cn";

import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

import {
  CODEX_EXEC_PREVIEW_LINES,
  CODEX_EXEC_STATUS_CLASS,
  CODEX_EXEC_STATUS_LABEL,
  CODEX_ROW_CLASS,
  CODEX_SHELL_TOKEN_CLASS,
} from "../constants/codex";
import { tokenizeShellCommand } from "../lib/codex-shell";
import type { CodexExecProps } from "../types/codex";

export const CodexShellCommand = ({ command }: { command: string }) =>
  tokenizeShellCommand(command).map((token, index) => (
    <span className={CODEX_SHELL_TOKEN_CLASS[token.kind]} key={index}>
      {token.text}
    </span>
  ));

export const CodexExec = ({
  className,
  command,
  output,
  previewLines = CODEX_EXEC_PREVIEW_LINES,
  status = "ran",
  ...props
}: CodexExecProps) => {
  const lines = output ? output.split("\n") : [];
  const preview = lines.slice(0, previewLines).join("\n");
  const rest = lines.slice(previewLines);

  return (
    <Collapsible
      className={cn(CODEX_ROW_CLASS, "text-codex-fg", className)}
      data-slot="codex-exec"
      data-status={status}
      {...props}
    >
      <span aria-hidden="true" className={CODEX_EXEC_STATUS_CLASS[status]}>
        •
      </span>
      <p className="min-w-0 truncate">
        <span className="font-bold">{CODEX_EXEC_STATUS_LABEL[status]}</span>{" "}
        <CodexShellCommand command={command} />
      </p>
      {lines.length > 0 && (
        <div className="text-codex-muted col-start-2 grid min-w-0 grid-cols-[2ch_minmax(0,1fr)]">
          <span aria-hidden="true">└</span>
          <pre className="min-w-0 font-[inherit] whitespace-pre-wrap">
            {preview}
          </pre>
          {rest.length > 0 && (
            <>
              <CollapsibleContent className="col-start-2 min-w-0">
                <pre className="font-[inherit] whitespace-pre-wrap">
                  {rest.join("\n")}
                </pre>
              </CollapsibleContent>
              <CollapsibleTrigger
                className="col-start-2 justify-self-start"
                render={
                  <Button
                    className="text-codex-muted hover:text-codex-fg aria-expanded:text-codex-fg focus-visible:ring-codex-blue/60 h-auto rounded-xs p-0 text-start font-[inherit] text-[length:inherit] leading-[inherit] font-normal whitespace-normal hover:bg-transparent focus-visible:border-transparent focus-visible:ring-1 active:not-aria-[haspopup]:translate-y-0 aria-expanded:bg-transparent dark:hover:bg-transparent"
                    variant="ghost"
                  />
                }
              >
                <span className="in-data-panel-open:hidden">
                  {`+ ${rest.length} lines (ctrl+t to expand)`}
                </span>
                <span className="hidden in-data-panel-open:inline">
                  − collapse
                </span>
              </CollapsibleTrigger>
            </>
          )}
        </div>
      )}
    </Collapsible>
  );
};
