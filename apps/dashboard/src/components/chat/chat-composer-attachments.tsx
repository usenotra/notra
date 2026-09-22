"use client";

import {
  File02Icon,
  PlusSignIcon,
  Upload04Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { MAX_CHAT_ATTACHMENTS } from "@notra/schemas/constants/dashboard/upload";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import { Loader2Icon } from "lucide-react";
import Image from "next/image";
import { createPortal } from "react-dom";

import { Composer } from "@/components/composer/composer-shell";
import { isImageMimeType } from "@/lib/upload/mime";
import type {
  ChatComposerAttachButtonProps,
  ChatComposerAttachmentChipsProps,
  ChatComposerDropOverlayProps,
} from "@/types/components/chat-composer-attachments";

export function ChatComposerAttachButton({
  attachmentCount,
  disabled,
  onAttach,
  pendingUploadCount,
  tooltip,
}: ChatComposerAttachButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Composer.ToolbarButton
            aria-label="Attach files"
            className="size-7 justify-center px-0"
            disabled={
              disabled ||
              attachmentCount + pendingUploadCount >= MAX_CHAT_ATTACHMENTS
            }
            onClick={onAttach}
          />
        }
      >
        <HugeiconsIcon className="size-4" icon={PlusSignIcon} />
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}

export function ChatComposerDropOverlay({
  acceptedFileTypesLabel,
}: ChatComposerDropOverlayProps) {
  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      aria-hidden="true"
      className="fade-in-0 animate-in bg-background/75 duration-fast pointer-events-none fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-sm"
    >
      <div className="flex flex-col items-center gap-5">
        <HugeiconsIcon
          className="text-foreground size-14"
          icon={Upload04Icon}
          strokeWidth={1.5}
        />
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="text-foreground text-2xl font-semibold tracking-tight">
            Add Attachment
          </p>
          <p className="text-muted-foreground text-sm">
            Drop a file here to attach it to your message
          </p>
          {acceptedFileTypesLabel ? (
            <p className="text-muted-foreground/70 text-xs">
              Accepted file types: {acceptedFileTypesLabel}
            </p>
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  );
}

export function ChatComposerAttachmentChips({
  attachments,
  pendingUploads,
  removeAttachment,
  setPreviewAttachment,
}: ChatComposerAttachmentChipsProps) {
  return (
    <>
      {attachments.map((attachment) => (
        <Composer.Chip
          icon={
            isImageMimeType(attachment.mediaType) ? (
              <Image
                alt={attachment.filename}
                className="size-4 rounded object-cover"
                height={16}
                src={attachment.url}
                width={16}
              />
            ) : (
              <HugeiconsIcon
                className="text-muted-foreground size-3.5"
                icon={File02Icon}
              />
            )
          }
          key={attachment.key}
          label={attachment.filename}
          onClick={() => {
            setPreviewAttachment(attachment);
          }}
          onRemove={() => {
            removeAttachment(attachment.key);
          }}
        />
      ))}
      {pendingUploads.map((pending) => (
        <Composer.Chip
          icon={<Loader2Icon className="size-3 animate-spin" />}
          key={pending.id}
          label={pending.filename}
          pending
        />
      ))}
    </>
  );
}
