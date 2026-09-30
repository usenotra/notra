import { cn } from "@notra/ui/lib/utils";
import type { ReactNode } from "react";

const TRAFFIC_LIGHTS = ["close", "minimize", "zoom"] as const;

/** The macOS terminal window a Claude Code session sits in. */
export function ClaudeCodeTerminal({
  title,
  children,
  className,
}: {
  title?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex w-full flex-col overflow-clip rounded-[1.25rem] bg-[#0f0f0f] [box-shadow:#28282833_0rem_1.5rem_3.5rem_-1rem]",
        className
      )}
    >
      <div className="relative flex min-h-10 items-center justify-center bg-[#1c1c1c] px-4.5 py-3">
        <div aria-hidden className="absolute left-4.5 flex items-center gap-1.5">
          {TRAFFIC_LIGHTS.map((light) => (
            <span
              className="size-2.5 shrink-0 rounded-full bg-[#3a3a3a]"
              key={light}
            />
          ))}
        </div>
        {title ? (
          <span className="font-mono text-[0.75rem] leading-4 text-[#FFFFFF66]">
            {title}
          </span>
        ) : null}
      </div>
      <div className="flex flex-col gap-5 px-3 py-4 sm:px-5 sm:py-5">
        {children}
      </div>
    </div>
  );
}
