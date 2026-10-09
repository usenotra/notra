import { cn } from "@notra/ui/lib/utils";

import type { AIOverviewHeaderProps } from "@notra/ui/types/google-ai-overview";
import { AIOverviewSparkleIcon } from "@notra/ui/components/ai-skins/google-ai-overview/ai-overview-icons";

export const AIOverviewHeader = ({
  children,
  className,
  icon = <AIOverviewSparkleIcon className="size-6 shrink-0" />,
  title = "AI Overview",
  ...props
}: AIOverviewHeaderProps) => (
  <div
    className={cn("flex items-center justify-between gap-4 pb-4", className)}
    data-slot="ai-overview-header"
    {...props}
  >
    <div className="text-aio-sparkle flex items-center gap-1.5">
      {icon}
      <h2 className="text-aio-label text-sm font-medium">{title}</h2>
    </div>
    {children}
  </div>
);
