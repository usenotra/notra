"use client";

import {
  ComputerTerminal01Icon,
  Robot01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { resolveEngineIconKey } from "@notra/geo-core/utils/geo-engine-icon";
import { ModelProviderLogo } from "@notra/ui/components/geo/model-provider-logo";
import { Gemini } from "@notra/ui/components/ui/svgs/gemini";
import { MicrosoftCopilot } from "@notra/ui/components/ui/svgs/microsoftCopilot";
import { Parallel } from "@notra/ui/components/ui/svgs/parallel";
import { Perplexity } from "@notra/ui/components/ui/svgs/perplexity";
import type { ComponentType, SVGProps } from "react";

import {
  SIMPLE_ENGINE_ICONS,
  THEMED_ENGINE_ICONS,
} from "@/constants/geo-engine-icons";
import { cn } from "@/lib/utils";
import type { EngineIconProps } from "@/types/geo";
import { splitModelId } from "@/utils/geo-model-display";

export function EngineIcon(props: EngineIconProps) {
  return (
    <span aria-hidden="true" className="contents">
      <EngineIconGraphic {...props} />
    </span>
  );
}

function EngineIconGraphic({
  engine,
  className,
  darkSurface,
}: EngineIconProps) {
  const key = resolveEngineIconKey(engine);
  if (!key) {
    const parsed = splitModelId(engine);
    if (!parsed) {
      return null;
    }
    return (
      <ModelProviderLogo className={className} provider={parsed.provider} />
    );
  }

  const iconClass = cn("size-4 shrink-0", className);

  const themed = THEMED_ENGINE_ICONS[key];
  if (themed) {
    return themedIcon(themed[0], themed[1], iconClass, darkSurface);
  }
  if (key === "gemini") {
    return <Gemini className={cn(iconClass, "overflow-visible")} />;
  }
  if (key === "perplexity") {
    return (
      <Perplexity className={cn(iconClass, darkSurface && "brightness-150")} />
    );
  }
  if (key === "parallel") {
    return (
      <Parallel
        className={cn(
          iconClass,
          darkSurface ? "text-[#FCFBFA]" : "text-[#1D1C1A] dark:text-[#FCFBFA]"
        )}
      />
    );
  }
  const simple = SIMPLE_ENGINE_ICONS[key];
  if (simple) {
    const Icon = simple;
    return <Icon className={iconClass} />;
  }
  if (key === "agent") {
    return <HugeiconsIcon className={iconClass} icon={Robot01Icon} />;
  }
  if (key === "cli") {
    return (
      <HugeiconsIcon className={iconClass} icon={ComputerTerminal01Icon} />
    );
  }
  return <MicrosoftCopilot className={iconClass} />;
}

function themedIcon(
  Light: ComponentType<SVGProps<SVGSVGElement>>,
  Dark: ComponentType<SVGProps<SVGSVGElement>>,
  iconClass: string,
  darkSurface = false
) {
  if (darkSurface) {
    return <Dark className={iconClass} />;
  }
  return (
    <>
      <Light className={cn(iconClass, "block dark:hidden")} />
      <Dark className={cn(iconClass, "hidden dark:block")} />
    </>
  );
}
