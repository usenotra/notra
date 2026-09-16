import { ClaudeAiIcon } from "@notra/ui/components/ui/svgs/claudeAiIcon";
import { Gemini } from "@notra/ui/components/ui/svgs/gemini";
import { Github } from "@notra/ui/components/ui/svgs/github";
import { Google } from "@notra/ui/components/ui/svgs/google";
import { Linear } from "@notra/ui/components/ui/svgs/linear";
import { Linkedin } from "@notra/ui/components/ui/svgs/linkedin";
import { Notra } from "@notra/ui/components/ui/svgs/notra";
import { Openai } from "@notra/ui/components/ui/svgs/openai";
import { OpenaiDark } from "@notra/ui/components/ui/svgs/openaiDark";
import { Perplexity } from "@notra/ui/components/ui/svgs/perplexity";
import { Slack } from "@notra/ui/components/ui/svgs/slack";
import { XTwitter } from "@notra/ui/components/ui/svgs/twitter";
import { cn } from "@notra/ui/lib/utils";

import type {
  McpUseCaseStackProps,
  McpUseCaseToolIconProps,
  McpUseCaseToolId,
} from "@/types/mcp-use-cases";

const TOOL_LABELS: Record<McpUseCaseToolId, string> = {
  notra: "Notra",
  claude: "Claude",
  chatgpt: "ChatGPT",
  gemini: "Gemini",
  perplexity: "Perplexity",
  "google-search-console": "Google Search Console",
  slack: "Slack",
  github: "GitHub",
  linear: "Linear",
  linkedin: "LinkedIn",
  x: "X",
};

function getMcpUseCaseToolLabel(toolId: McpUseCaseToolId): string {
  return TOOL_LABELS[toolId];
}

function McpUseCaseToolIcon({ toolId, className }: McpUseCaseToolIconProps) {
  const iconClass = cn("size-full", className);

  switch (toolId) {
    case "notra":
      return <Notra className={iconClass} />;
    case "claude":
      return <ClaudeAiIcon className={iconClass} />;
    case "chatgpt":
      return (
        <>
          <Openai className={cn(iconClass, "dark:hidden")} />
          <OpenaiDark className={cn(iconClass, "hidden dark:block")} />
        </>
      );
    case "gemini":
      return <Gemini className={iconClass} />;
    case "perplexity":
      return <Perplexity className={iconClass} />;
    case "google-search-console":
      return <Google className={iconClass} />;
    case "slack":
      return <Slack className={iconClass} />;
    case "github":
      return (
        <Github className={cn(iconClass, "text-[#1E1E1E] dark:text-white")} />
      );
    case "linear":
      return <Linear className={iconClass} />;
    case "linkedin":
      return (
        <Linkedin className={cn(iconClass, "text-[#0A66C2] dark:text-white")} />
      );
    case "x":
      return (
        <XTwitter className={cn(iconClass, "text-[#1E1E1E] dark:text-white")} />
      );
    default:
      return null;
  }
}

const STACK_TILE_SIZE = {
  sm: "size-8 p-1.75 rounded-[0.5625rem]",
  md: "size-11 p-2.5 rounded-xl",
} as const;

export function McpUseCaseStack({
  stack,
  size = "sm",
  className,
}: McpUseCaseStackProps) {
  return (
    <ul
      aria-label="Tools used in this workflow"
      className={cn("flex items-center gap-1.5", className)}
    >
      {stack.map((toolId) => (
        <li
          className={cn(
            "flex shrink-0 items-center justify-center bg-white [box-shadow:#ECECEC_0_0_0_0.0625rem,#28282814_0_0.0625rem_0.125rem] dark:bg-white/[0.06] dark:[box-shadow:#FFFFFF1F_0_0_0_0.0625rem]",
            STACK_TILE_SIZE[size]
          )}
          key={toolId}
          title={getMcpUseCaseToolLabel(toolId)}
        >
          <McpUseCaseToolIcon toolId={toolId} />
          <span className="sr-only">{getMcpUseCaseToolLabel(toolId)}</span>
        </li>
      ))}
    </ul>
  );
}
