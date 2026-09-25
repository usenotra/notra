"use client";

import {
  createContext,
  use,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";

import { cn } from "@notra/ui/lib/utils";

import { Button } from "./button";

const ReleaseNoteContext = createContext<{
  open: boolean;
  setOpen: (open: boolean) => void;
} | null>(null);

function useReleaseNote() {
  const value = use(ReleaseNoteContext);
  if (!value) {
    throw new Error("Release note parts must render inside ReleaseNote");
  }
  return value;
}

function ReleaseNote({
  open: openProp,
  defaultOpen = true,
  onOpenChange,
  children,
}: {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const open = openProp ?? uncontrolledOpen;

  function setOpen(next: boolean) {
    onOpenChange?.(next);
    if (openProp === undefined) {
      setUncontrolledOpen(next);
    }
  }

  return (
    <ReleaseNoteContext value={{ open, setOpen }}>{children}</ReleaseNoteContext>
  );
}

function ReleaseNoteContent({ className, ...props }: ComponentProps<"div">) {
  const { open } = useReleaseNote();
  if (!open) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed bottom-4 left-4 z-50 w-[min(36rem,calc(100%-2rem))] overflow-hidden rounded-xl bg-background text-sm shadow-lg ring-1 ring-foreground/10",
        className
      )}
      data-slot="release-note"
      role="status"
      {...props}
    />
  );
}

function ReleaseNoteVisual({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex min-h-44 items-center justify-center overflow-x-auto bg-muted/40 px-5 py-6",
        className
      )}
      data-slot="release-note-visual"
      {...props}
    />
  );
}

function ReleaseNoteHeader({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("space-y-2 border-t px-5 pt-4", className)}
      data-slot="release-note-header"
      {...props}
    />
  );
}

function ReleaseNoteTitle({ className, ...props }: ComponentProps<"h2">) {
  return (
    <h2
      className={cn("font-semibold text-base tracking-tight", className)}
      data-slot="release-note-title"
      {...props}
    />
  );
}

function ReleaseNoteDescription({ className, ...props }: ComponentProps<"p">) {
  return (
    <p
      className={cn("text-muted-foreground text-sm leading-relaxed", className)}
      data-slot="release-note-description"
      {...props}
    />
  );
}

function ReleaseNoteFooter({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("flex justify-end px-5 pt-3 pb-4", className)}
      data-slot="release-note-footer"
      {...props}
    />
  );
}

function ReleaseNoteAction({
  className,
  children = "OK",
  onClick,
  ...props
}: ComponentProps<typeof Button>) {
  const { setOpen } = useReleaseNote();

  return (
    <Button
      className={cn("min-w-16", className)}
      {...props}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) {
          setOpen(false);
        }
      }}
    >
      {children}
    </Button>
  );
}

export {
  ReleaseNote,
  ReleaseNoteAction,
  ReleaseNoteContent,
  ReleaseNoteDescription,
  ReleaseNoteFooter,
  ReleaseNoteHeader,
  ReleaseNoteTitle,
  ReleaseNoteVisual,
};
