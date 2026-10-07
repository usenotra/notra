"use client";

import {
  Alert02Icon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  InformationCircleIcon,
  MultiplicationSignCircleIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Spinner } from "@notra/ui/components/ui/spinner";
import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

import { buttonVariants } from "@notra/ui/components/ui/button";
import { cn } from "@notra/ui/lib/utils";

// Same surface language as the secondary button and the tooltip: squircle
// corners, a soft top-to-bottom gradient, an inset top highlight and a
// layered drop shadow. Rendered unstyled so Sonner's own CSS stays out of it.
const toastClassName = cn(
  "group/toast flex w-(--width) items-center gap-2.5 rounded-[0.875rem] border border-border bg-background bg-linear-to-b from-background to-muted/60 p-3 text-popover-foreground text-sm [corner-shape:squircle]",
  "shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_1px_2px_rgba(0,0,0,0.06),0_8px_24px_-8px_rgba(0,0,0,0.14)]",
  "dark:border-input dark:bg-muted dark:from-input dark:to-muted dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_1px_2px_rgba(0,0,0,0.4),0_8px_24px_-8px_rgba(0,0,0,0.6)]",
  // Sonner hides the content of toasts stacked behind the front one, but only
  // for styled toasts.
  "data-[expanded=false]:data-[front=false]:*:opacity-0 *:transition-opacity *:duration-fast"
);

const iconClassName = cn(
  "relative flex size-6 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground [corner-shape:squircle] [&_svg]:size-3.5",
  "group-data-[type=success]/toast:bg-success/12 group-data-[type=success]/toast:text-success",
  "group-data-[type=error]/toast:bg-destructive/12 group-data-[type=error]/toast:text-destructive",
  // The dark --destructive (L 0.6) is too dim on a dark chip; lift it onto the
  // L 0.70 grid the other dark status colours use (see status.css).
  "dark:group-data-[type=error]/toast:bg-[oklch(0.7_0.16_25/0.15)] dark:group-data-[type=error]/toast:text-[oklch(0.7_0.16_25)]",
  "group-data-[type=warning]/toast:bg-warning/12 group-data-[type=warning]/toast:text-warning",
  "group-data-[type=info]/toast:bg-info/12 group-data-[type=info]/toast:text-info"
);

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      className="toaster group"
      gap={8}
      icons={{
        success: (
          <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} />
        ),
        info: <HugeiconsIcon icon={InformationCircleIcon} strokeWidth={2} />,
        warning: <HugeiconsIcon icon={Alert02Icon} strokeWidth={2} />,
        error: (
          <HugeiconsIcon icon={MultiplicationSignCircleIcon} strokeWidth={2} />
        ),
        loading: <Spinner />,
        close: <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />,
      }}
      theme={theme as ToasterProps["theme"]}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast: toastClassName,
          icon: iconClassName,
          content: "flex min-w-0 flex-1 flex-col gap-0.5",
          title: "font-medium leading-snug",
          description: "text-[0.8rem] text-muted-foreground leading-snug",
          actionButton: buttonVariants({ size: "xs" }),
          cancelButton: buttonVariants({ variant: "ghost", size: "xs" }),
          closeButton: cn(
            buttonVariants({ variant: "secondary", size: "icon-xs" }),
            "-top-2 -left-2 absolute size-5 rounded-full opacity-0 transition-opacity group-hover/toast:opacity-100 group-focus-within/toast:opacity-100 [&_svg]:size-2.5"
          ),
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
