"use client";

import { File02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useTranslations } from "use-intl";

import type { ChatFileAttachmentProps } from "@/types/components/chat-input";
import { getAttachmentExtension } from "@/utils/chat-input";

// Square tile for non-image files so they sit in the same grid as images.
export function ChatFileAttachment({
  url,
  filename,
  mediaType,
}: ChatFileAttachmentProps) {
  const tCommon = useTranslations("common");
  const name = filename ?? tCommon("labels.attachment");
  const extension = getAttachmentExtension(filename, mediaType);

  return (
    <a
      className="border-border bg-muted/40 text-foreground hover:bg-muted focus-visible:ring-ring flex size-full flex-col justify-between overflow-hidden rounded-lg border p-3 text-left no-underline transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
      href={url}
      rel="noopener noreferrer"
      target="_blank"
      title={name}
    >
      <span className="bg-background text-muted-foreground flex size-9 items-center justify-center rounded-md border">
        <HugeiconsIcon className="size-4.5" icon={File02Icon} />
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="line-clamp-2 text-xs font-medium break-all">
          {name}
        </span>
        {extension ? (
          <span className="text-muted-foreground text-xs uppercase">
            {extension}
          </span>
        ) : null}
      </span>
    </a>
  );
}
