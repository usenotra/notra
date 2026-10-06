"use client";

import { Image } from "@notra/ui/components/framework-provider";
import { cn } from "@notra/ui/lib/utils";
import type { ModelProviderLogoProps } from "@notra/ui/types/geo";
import { modelsDevLogoUrl } from "@notra/ui/lib/geo-model-display";

const LOGO_SIZE_PX = 16;

export function ModelProviderLogo({
  provider,
  className,
}: ModelProviderLogoProps) {
  return (
    <Image
      alt={`${provider} logo`}
      className={cn("size-4 shrink-0 dark:invert", className)}
      height={LOGO_SIZE_PX}
      src={modelsDevLogoUrl(provider)}
      unoptimized
      width={LOGO_SIZE_PX}
    />
  );
}
