import { cn } from "cn";
import type { ComponentProps } from "react";

import { Button } from "@/components/ui/button";

import { AIOverviewMoreIcon } from "./ai-overview-icons";

export const AIOverviewSourceAction = ({
  "aria-label": ariaLabel = "About this result",
  className,
  ...props
}: ComponentProps<typeof Button>) => (
  <Button
    aria-label={ariaLabel}
    className={cn(
      "text-aio-action hover:bg-aio-action/8 hover:text-aio-action dark:hover:bg-aio-action/8 focus-visible:outline-aio-focus active:bg-aio-action/22 size-9 rounded-full p-2.25 focus-visible:border-transparent focus-visible:ring-0 focus-visible:outline-2 focus-visible:outline-solid active:not-aria-[haspopup]:translate-y-0",
      className
    )}
    data-slot="ai-overview-source-action"
    size="icon"
    variant="ghost"
    {...props}
  >
    <AIOverviewMoreIcon className="size-4.5" />
  </Button>
);
