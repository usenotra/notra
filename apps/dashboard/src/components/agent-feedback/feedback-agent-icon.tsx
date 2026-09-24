"use client";

import { Robot01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Amp } from "@notra/ui/components/ui/svgs/amp";
import { ClaudeAiIcon } from "@notra/ui/components/ui/svgs/claudeAiIcon";
import { Cline } from "@notra/ui/components/ui/svgs/cline";
import { Cursor } from "@notra/ui/components/ui/svgs/cursor";
import { Devin } from "@notra/ui/components/ui/svgs/devin";
import { Gemini } from "@notra/ui/components/ui/svgs/gemini";
import { MicrosoftCopilot } from "@notra/ui/components/ui/svgs/microsoftCopilot";
import { Notra } from "@notra/ui/components/ui/svgs/notra";
import { Openai } from "@notra/ui/components/ui/svgs/openai";
import { OpenaiDark } from "@notra/ui/components/ui/svgs/openaiDark";
import { Playwright } from "@notra/ui/components/ui/svgs/playwright";
import { Vercel } from "@notra/ui/components/ui/svgs/vercel";
import { Windsurf } from "@notra/ui/components/ui/svgs/windsurf";
import { cn } from "@notra/ui/lib/utils";

import { AGENT_FEEDBACK_UNSPECIFIED_LABEL } from "@/constants/agent-feedback";
import type {
  AgentFeedbackAgentIconProps,
  AgentFeedbackAgentProps,
  AgentFeedbackClientBrand,
} from "@/types/agent-feedback";
import { resolveAgentFeedbackClientBrand } from "@/utils/agent-feedback-client";

const ICON_CLASS = "size-4 shrink-0";

function AgentBrandMark({
  brand,
  className,
}: {
  brand: AgentFeedbackClientBrand;
  className: string;
}) {
  if (brand === "claude") {
    return <ClaudeAiIcon className={className} />;
  }
  if (brand === "cursor") {
    return <Cursor className={className} />;
  }
  if (brand === "openai") {
    return (
      <>
        <Openai className={cn(className, "block dark:hidden")} />
        <OpenaiDark className={cn(className, "hidden dark:block")} />
      </>
    );
  }
  if (brand === "vercel") {
    return <Vercel className={className} />;
  }
  if (brand === "windsurf") {
    return <Windsurf className={className} />;
  }
  if (brand === "amp") {
    return <Amp className={cn(className, "h-4 w-auto")} />;
  }
  if (brand === "playwright") {
    return <Playwright className={className} />;
  }
  if (brand === "notra") {
    return (
      <span className="flex shrink-0 items-center justify-center rounded-sm dark:bg-[#F6F3F1] dark:ring-1 dark:ring-white/10">
        <Notra className={className} />
      </span>
    );
  }
  if (brand === "cline") {
    return <Cline className={className} />;
  }
  if (brand === "devin") {
    return <Devin className={className} />;
  }
  if (brand === "copilot") {
    return <MicrosoftCopilot className={className} />;
  }
  return <Gemini className={cn(className, "overflow-visible")} />;
}

function AgentFeedbackAgentIcon({
  client,
  className,
}: AgentFeedbackAgentIconProps) {
  const brand = resolveAgentFeedbackClientBrand(client);
  const iconClass = cn(ICON_CLASS, className);

  if (brand) {
    return <AgentBrandMark brand={brand} className={iconClass} />;
  }

  return (
    <HugeiconsIcon
      aria-hidden="true"
      className={cn(iconClass, "text-muted-foreground")}
      icon={Robot01Icon}
    />
  );
}

export function AgentFeedbackAgent({
  client,
  className,
}: AgentFeedbackAgentProps) {
  const label = client ?? AGENT_FEEDBACK_UNSPECIFIED_LABEL;

  return (
    <span className={cn("inline-flex min-w-0 items-center gap-2", className)}>
      <AgentFeedbackAgentIcon client={client} />
      <span className="truncate">{label}</span>
    </span>
  );
}
