"use client";

import type { ComponentProps } from "react";

import { cn } from "@notra/ui/lib/utils";

import { Button } from "./button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "./dialog";

function ReleaseNote(props: ComponentProps<typeof Dialog>) {
  return <Dialog data-slot="release-note" {...props} />;
}

function ReleaseNoteTrigger(props: ComponentProps<typeof DialogTrigger>) {
  return <DialogTrigger data-slot="release-note-trigger" {...props} />;
}

function ReleaseNoteContent({
  className,
  ...props
}: ComponentProps<typeof DialogContent>) {
  return (
    <DialogContent
      className={cn(
        "gap-0 overflow-hidden p-0 sm:max-w-xl",
        className
      )}
      data-slot="release-note-content"
      showCloseButton={false}
      {...props}
    />
  );
}

function ReleaseNoteVisual({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex min-h-52 items-center justify-center bg-muted/40 px-6 py-8",
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
      className={cn("space-y-2 border-t px-5 pt-5", className)}
      data-slot="release-note-header"
      {...props}
    />
  );
}

function ReleaseNoteTitle({
  className,
  ...props
}: ComponentProps<typeof DialogTitle>) {
  return (
    <DialogTitle
      className={cn("text-base font-semibold tracking-tight", className)}
      data-slot="release-note-title"
      {...props}
    />
  );
}

function ReleaseNoteDescription({
  className,
  ...props
}: ComponentProps<typeof DialogDescription>) {
  return (
    <DialogDescription
      className={cn("text-sm leading-relaxed", className)}
      data-slot="release-note-description"
      {...props}
    />
  );
}

function ReleaseNoteFooter({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("flex justify-end px-5 pt-4 pb-5", className)}
      data-slot="release-note-footer"
      {...props}
    />
  );
}

function ReleaseNoteAction({
  className,
  children = "OK",
  ...props
}: ComponentProps<typeof Button>) {
  return (
    <DialogClose
      render={<Button className={cn("min-w-16", className)} {...props} />}
    >
      {children}
    </DialogClose>
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
  ReleaseNoteTrigger,
  ReleaseNoteVisual,
};
