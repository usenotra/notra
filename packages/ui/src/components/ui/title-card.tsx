import type * as React from "react";

import { cn } from "@notra/ui/lib/utils";

interface TitleCardProps extends Omit<React.ComponentProps<"div">, "title"> {
  heading: React.ReactNode;
  as?: "div" | "section";
  headingAs?: "p" | "h2";
  icon?: React.ReactNode;
  action?: React.ReactNode;
  footer?: React.ReactNode;
  accentColor?: string;
  hoverBackground?: React.ReactNode;
  contentClassName?: string;
  footerClassName?: string;
  accentClassName?: string;
  disabled?: boolean;
}

function TitleCard({
  heading,
  as: Root = "div",
  headingAs: Heading = "p",
  icon,
  action,
  footer,
  accentColor,
  hoverBackground,
  className,
  contentClassName,
  footerClassName,
  accentClassName,
  disabled = false,
  children,
  ...props
}: TitleCardProps) {
  const gradientStyle = accentColor
    ? {
        backgroundImage: `linear-gradient(to bottom right, ${accentColor}20 0%, transparent 50%)`,
      }
    : undefined;

  return (
    <Root
      aria-disabled={disabled || undefined}
      className={cn(
        "group relative isolate flex flex-col overflow-hidden rounded-lg border border-border/80 border-b-border/40 bg-muted/80",
        disabled && "cursor-not-allowed",
        className
      )}
      {...props}
    >
      {accentColor && (
        <div
          className={cn(
            "pointer-events-none absolute inset-0 -z-10 opacity-0",
            !disabled && "group-hover:opacity-100",
            accentClassName ?? "transition-opacity duration-normal"
          )}
          style={gradientStyle}
        />
      )}
      {hoverBackground && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10"
        >
          {hoverBackground}
        </div>
      )}
      <div className="flex min-h-10 items-center justify-between gap-4 px-4">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {icon && (
            <div className="flex size-8 shrink-0 items-center justify-center text-muted-foreground [&_svg]:size-5">
              {icon}
            </div>
          )}
          <Heading className="min-w-0 flex-1 truncate font-medium text-lg">
            {heading}
          </Heading>
        </div>
        {action && (
          <div className="flex shrink-0 items-center gap-2">{action}</div>
        )}
      </div>
      <div
        className={cn(
          "flex-1 rounded-t-lg border-border/60 border-t bg-background px-4 py-3",
          contentClassName
        )}
      >
        {children}
      </div>
      {footer && (
        <div
          className={cn(
            "flex items-center justify-between gap-4 border-border/80 border-t bg-background px-4 py-3",
            footerClassName
          )}
        >
          {footer}
        </div>
      )}
    </Root>
  );
}

export { TitleCard };
export type { TitleCardProps };
