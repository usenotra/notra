import { cn } from "@notra/ui/lib/utils";

import type { IntegrationBannerProps } from "@/types/integrations";

import { IntegrationLogo } from "./integration-logo";

export function IntegrationBanner({
  integration,
  className,
  priority = false,
}: IntegrationBannerProps) {
  if (integration.bannerUrl) {
    return (
      <div className={cn("relative overflow-hidden", className)}>
        <img
          alt={`${integration.name} banner`}
          className="absolute inset-0 size-full object-cover"
          decoding="async"
          fetchPriority={priority ? "high" : "auto"}
          loading={priority ? "eager" : "lazy"}
          src={integration.bannerUrl}
        />
      </div>
    );
  }

  const brandColor = integration.brandColor ?? "#7C3AED";

  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden bg-[#EEF0FB] dark:bg-white/[0.04]",
        className
      )}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background: `linear-gradient(120deg, ${brandColor}26 0%, ${brandColor}0d 100%)`,
        }}
      />
      <IntegrationLogo
        className="relative flex items-center justify-center"
        integration={integration}
        size={64}
      />
    </div>
  );
}
