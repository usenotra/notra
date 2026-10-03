import { ClaudeAiIcon } from "@notra/ui/components/ui/svgs/claudeAiIcon";
import { Gemini } from "@notra/ui/components/ui/svgs/gemini";
import { Openai } from "@notra/ui/components/ui/svgs/openai";
import { Perplexity } from "@notra/ui/components/ui/svgs/perplexity";
import { cn } from "@notra/ui/lib/utils";

import type { FeatureEngineIconProps } from "@/types/feature-detail-page";

export function EngineIcon({
  engine,
  className,
  adaptive = false,
}: FeatureEngineIconProps) {
  const iconClassName = cn("shrink-0", className);

  if (engine === "chatgpt") {
    return (
      <Openai
        aria-hidden="true"
        className={cn(iconClassName, adaptive && "dark:fill-white")}
      />
    );
  }

  if (engine === "claude") {
    return <ClaudeAiIcon aria-hidden="true" className={iconClassName} />;
  }

  if (engine === "gemini") {
    return <Gemini aria-hidden="true" className={iconClassName} />;
  }

  return <Perplexity aria-hidden="true" className={iconClassName} />;
}
