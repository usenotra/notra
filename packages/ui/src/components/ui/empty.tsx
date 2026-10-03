import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@notra/ui/lib/utils";

const emptyMediaVariants = cva(
  "flex shrink-0 items-center justify-center [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        icon: "relative size-10 rounded-lg border bg-card text-foreground shadow-xs before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(var(--radius-lg)-1px)] before:shadow-[0_1px_rgb(0_0_0/0.04)] dark:before:shadow-[0_-1px_rgb(255_255_255/0.06)] [&_svg:not([class*='size-'])]:size-5",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Empty({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 flex-col items-center justify-center gap-6 px-6 py-12 text-center text-balance md:py-16",
        className
      )}
      data-slot="empty"
      {...props}
    />
  );
}

function EmptyHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex max-w-sm flex-col items-center text-center", className)}
      data-slot="empty-header"
      {...props}
    />
  );
}

/** With `variant="icon"`, two tilted tiles fan out behind the icon tile. */
function EmptyMedia({
  className,
  variant = "default",
  children,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof emptyMediaVariants>) {
  return (
    <div
      className="relative mb-5"
      data-slot="empty-media"
      data-variant={variant}
    >
      {variant === "icon" ? (
        <>
          <div
            aria-hidden="true"
            className={cn(
              emptyMediaVariants({ variant }),
              "absolute bottom-px origin-bottom-left -translate-x-0.5 -rotate-10 scale-84 shadow-none"
            )}
          />
          <div
            aria-hidden="true"
            className={cn(
              emptyMediaVariants({ variant }),
              "absolute bottom-px origin-bottom-right translate-x-0.5 rotate-10 scale-84 shadow-none"
            )}
          />
        </>
      ) : null}
      <div className={cn(emptyMediaVariants({ variant }), className)} {...props}>
        {children}
      </div>
    </div>
  );
}

function EmptyTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return (
    <h3
      className={cn("font-semibold text-lg", className)}
      data-slot="empty-title"
      {...props}
    />
  );
}

function EmptyDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      className={cn(
        "text-muted-foreground text-sm text-pretty [&>a:hover]:text-primary [&>a]:underline [&>a]:underline-offset-4 [[data-slot=empty-title]+&]:mt-1",
        className
      )}
      data-slot="empty-description"
      {...props}
    />
  );
}

function EmptyContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex w-full min-w-0 max-w-sm flex-col items-center gap-4 text-balance text-sm",
        className
      )}
      data-slot="empty-content"
      {...props}
    />
  );
}

export {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
};
