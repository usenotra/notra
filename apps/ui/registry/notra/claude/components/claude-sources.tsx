import { cn } from "cn";

import type { ClaudeSourcesProps } from "../types/claude";
import { ClaudeSourceLink } from "./claude-source-link";

export const ClaudeSources = ({
  className,
  label = "Sources:",
  sources,
  ...props
}: ClaudeSourcesProps) => {
  if (sources.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "font-claude-serif text-claude-fg text-[0.9375rem] leading-[1.65]",
        className
      )}
      data-slot="claude-sources"
      {...props}
    >
      <p>{label}</p>
      <ul className="mt-2 flex list-disc flex-col gap-1.5 ps-6 marker:text-current">
        {sources.map((source) => (
          <li key={source.href}>
            <ClaudeSourceLink source={source}>{source.title}</ClaudeSourceLink>
          </li>
        ))}
      </ul>
    </div>
  );
};
