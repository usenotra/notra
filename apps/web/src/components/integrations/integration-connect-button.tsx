import { ctaButtonVariants } from "@notra/ui/components/shared/cta-button";
import { cn } from "@notra/ui/lib/utils";

import { getIntegrationConnectUrl } from "@/lib/integrations/helpers";
import type { IntegrationConnectButtonProps } from "@/types/integrations";

export function IntegrationConnectButton({
  integration,
  className,
  label = "Connect",
}: IntegrationConnectButtonProps) {
  return (
    <a
      className={cn(
        ctaButtonVariants({ size: "sm", variant: "flat" }),
        "h-auto font-sans font-semibold",
        className
      )}
      href={getIntegrationConnectUrl(integration)}
    >
      {label}
    </a>
  );
}
