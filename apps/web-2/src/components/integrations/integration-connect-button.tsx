import { cn } from "@notra/ui/lib/utils";

import { getIntegrationConnectUrl } from "@/lib/integrations/helpers";
import type { IntegrationConnectButtonProps } from "@/types/integrations";

const PRIMARY_CLASSNAME = "cta-gradient-primary-flat text-white";

export function IntegrationConnectButton({
  integration,
  className,
  label = "Connect",
}: IntegrationConnectButtonProps) {
  return (
    <a
      className={cn(
        "focus-visible:ring-primary focus-visible:ring-offset-background inline-flex shrink-0 cursor-pointer items-center justify-center rounded-full font-sans font-semibold outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        PRIMARY_CLASSNAME,
        className
      )}
      href={getIntegrationConnectUrl(integration)}
    >
      {label}
    </a>
  );
}
