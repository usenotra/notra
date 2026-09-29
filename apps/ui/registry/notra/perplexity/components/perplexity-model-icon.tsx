import { cn } from "cn";
import type { ComponentType, SVGProps } from "react";

import type {
  PerplexityModelIconProps,
  PerplexityModelProvider,
} from "../types/perplexity";
import {
  PerplexityClaudeIcon,
  PerplexityGeminiIcon,
  PerplexityGrokIcon,
  PerplexityKimiIcon,
  PerplexityLogoIcon,
  PerplexityNvidiaIcon,
  PerplexityOpenAIIcon,
  PerplexityZaiIcon,
} from "./perplexity-icons";

const PROVIDER_ICONS: Record<
  PerplexityModelProvider,
  ComponentType<SVGProps<SVGSVGElement>>
> = {
  anthropic: PerplexityClaudeIcon,
  google: PerplexityGeminiIcon,
  kimi: PerplexityKimiIcon,
  nvidia: PerplexityNvidiaIcon,
  openai: PerplexityOpenAIIcon,
  perplexity: PerplexityLogoIcon,
  xai: PerplexityGrokIcon,
  zhipu: PerplexityZaiIcon,
};

export const PerplexityModelIcon = ({
  className,
  provider,
  ...props
}: PerplexityModelIconProps) => {
  const Icon = PROVIDER_ICONS[provider];

  return (
    <span
      className={cn(
        "text-pplx-subtle flex size-4 shrink-0 items-center justify-center grayscale",
        className
      )}
      data-slot="perplexity-model-icon"
      {...props}
    >
      <Icon className="size-4" />
    </span>
  );
};
