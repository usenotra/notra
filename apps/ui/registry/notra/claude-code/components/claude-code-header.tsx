import { cn } from "cn";

import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import type { ClaudeCodeHeaderProps } from "../types/claude-code";
import { ClaudeCodeLogo } from "./claude-code-icons";

export const ClaudeCodeHeader = ({
  className,
  cwd = "~/",
  model,
  org,
  tips = ["Ask Claude to create a new app or clone a repo"],
  title = "Claude Code",
  user,
  variant = "full",
  version = "v2.1.206",
  whatsNew = [
    "Added directory path suggestions to /cd",
    "Added a /doctor check that proposes trims",
  ],
  ...props
}: ClaudeCodeHeaderProps) => {
  if (variant === "compact") {
    return (
      <Card
        className={cn(
          "font-claude-code text-claude-code-muted min-w-0 flex-row items-center gap-[2ch] rounded-none bg-transparent py-0 text-[0.8125rem] leading-[1.125rem] ring-0",
          className
        )}
        data-slot="claude-code-header"
        data-variant="compact"
        {...props}
      >
        <ClaudeCodeLogo
          className="text-claude-code-accent shrink-0"
          scale={4}
        />
        <CardContent className="min-w-0 px-0">
          <CardTitle className="text-claude-code-fg truncate text-[0.8125rem] leading-[1.125rem] font-semibold">
            {title}{" "}
            <span className="text-claude-code-muted font-normal">
              {version}
            </span>
          </CardTitle>
          {model && <div className="truncate">{model}</div>}
          {cwd && <div className="truncate">{cwd}</div>}
        </CardContent>
      </Card>
    );
  }

  const hasTips = tips.length > 0;
  const hasWhatsNew = whatsNew.length > 0;

  return (
    <Card
      className={cn(
        "border-claude-code-accent font-claude-code text-claude-code-fg relative min-w-0 gap-0 overflow-visible rounded-md border bg-transparent px-3 pt-4 pb-3.5 text-[0.8125rem] leading-[1.125rem] ring-0 sm:px-4",
        className
      )}
      data-slot="claude-code-header"
      data-variant="full"
      {...props}
    >
      <CardTitle className="bg-claude-code-bg text-claude-code-accent absolute -top-2.5 left-3 block max-w-[calc(100%-1.5rem)] truncate px-2 text-[0.8125rem] leading-[1.125rem] font-normal">
        {title} <span className="text-claude-code-muted">{version}</span>
      </CardTitle>

      <CardContent className="grid min-w-0 gap-4 px-0 sm:grid-cols-[minmax(0,1fr)_1px_minmax(0,1.1fr)]">
        <div className="flex min-w-0 flex-col items-center gap-2 py-1 text-center">
          <div className="font-semibold">
            {user ? `Welcome back ${user}!` : "Welcome back!"}
          </div>
          <ClaudeCodeLogo className="text-claude-code-accent my-1.5" />
          {(model || org || cwd) && (
            <div className="text-claude-code-muted min-w-0 space-y-0.5 wrap-break-word">
              {model && <div>{model}</div>}
              {org && <div>{org}</div>}
              {cwd && <div>{cwd}</div>}
            </div>
          )}
        </div>

        <Separator
          className="bg-claude-code-accent/33 hidden w-px self-stretch sm:block"
          orientation="vertical"
        />

        <div className="min-w-0 space-y-1">
          {hasTips && (
            <>
              <div className="text-claude-code-accent font-semibold">
                Tips for getting started
              </div>
              {tips.map((tip) => (
                <div className="truncate" key={tip}>
                  {tip}
                </div>
              ))}
            </>
          )}
          {hasTips && hasWhatsNew && (
            <Separator className="bg-claude-code-accent my-1.5 h-px w-full" />
          )}
          {hasWhatsNew && (
            <>
              <div className="text-claude-code-accent font-semibold">
                What&apos;s new
              </div>
              {whatsNew.map((item) => (
                <div className="truncate" key={item}>
                  {item}
                </div>
              ))}
              <div className="text-claude-code-muted truncate italic">
                /release-notes for more
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
