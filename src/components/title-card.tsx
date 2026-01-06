import type * as React from "react";

import { cn } from "@/lib/utils";

interface TitleCardProps extends Omit<React.ComponentProps<"div">, "title"> {
  heading: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  accentColor?: string;
  contentClassName?: string;
}

function TitleCard({
  heading,
  icon,
  action,
  accentColor,
  className,
  contentClassName,
  children,
  ...props
}: TitleCardProps) {
  const gradientStyle = accentColor
    ? {
        backgroundImage: `linear-gradient(to bottom right, ${accentColor}20 0%, transparent 50%)`,
      }
    : undefined;

  return (
    <div
      className={cn(
        "group relative flex flex-col rounded-[20px] border border-border/80 bg-muted/80 p-2 shadow-sm",
        className
      )}
      {...props}
    >
      {accentColor && (
        <div
          className="pointer-events-none absolute inset-0 rounded-[20px] opacity-0 transition-opacity duration-200 group-hover:opacity-100"
          style={gradientStyle}
        />
      )}
      <div className="flex items-start justify-between gap-4 px-2 py-1.5">
        <div className="flex items-center gap-2">
          {icon && (
            <div className="flex size-6 shrink-0 items-center justify-center text-muted-foreground [&_svg]:size-5">
              {icon}
            </div>
          )}
          <h2 className="font-medium text-lg">{heading}</h2>
        </div>
        {action && (
          <div className="flex shrink-0 items-center gap-2">{action}</div>
        )}
      </div>
      <div
        className={cn(
          "flex-1 rounded-[12px] border border-border/80 bg-background p-4 shadow-xs",
          contentClassName
        )}
      >
        {children}
      </div>
    </div>
  );
}

export { TitleCard };
