import { cn } from "@notra/ui/lib/utils";

import { Avatar, AvatarFallback, AvatarImage } from "@notra/ui/components/ui/avatar";

import type { AIOverviewFaviconProps } from "@notra/ui/types/google-ai-overview";

export const AIOverviewFavicon = ({
  className,
  name,
  src,
  ...props
}: AIOverviewFaviconProps) => (
  <Avatar
    className={cn(
      "after:border-aio-border size-4.5 bg-white after:mix-blend-normal dark:after:mix-blend-normal",
      className
    )}
    data-slot="ai-overview-favicon"
    {...props}
  >
    <AvatarImage alt="" className="object-contain p-0.5" src={src} />
    <AvatarFallback className="text-aio-muted bg-white text-[0.5rem] font-medium">
      {Array.from(name)[0]}
    </AvatarFallback>
  </Avatar>
);
