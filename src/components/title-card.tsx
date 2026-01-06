import type * as React from "react";

import { cn } from "@/lib/utils";

interface TitleCardProps extends Omit<React.ComponentProps<"div">, "title"> {
  heading: React.ReactNode;
  action?: React.ReactNode;
  contentClassName?: string;
}

function TitleCard({
  heading,
  action,
  className,
  contentClassName,
  children,
  ...props
}: TitleCardProps) {
  return (
    <div
      className={cn(
        "rounded-[20px] border border-border/50 bg-muted/50 p-2 shadow-sm",
        className
      )}
      {...props}
    >
      <div className="flex items-center justify-between gap-4 px-2 py-1.5">
        <h2 className="font-semibold text-lg">{heading}</h2>
        {action && <div className="flex items-center gap-2">{action}</div>}
      </div>
      <div className={cn("rounded-[12px] bg-background p-4", contentClassName)}>
        {children}
      </div>
    </div>
  );
}

export { TitleCard };
