"use client";

import type { ChatImageAttachmentProps } from "@notra/ai/types/chat";
import Image from "next/image";
import { useState } from "react";

import { cn } from "@/lib/utils";

export function ChatImageAttachment({
  url,
  filename,
  mediaType,
  onClick,
}: ChatImageAttachmentProps) {
  const [hasError, setHasError] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  if (hasError) {
    return (
      <div className="border-border bg-muted/40 text-muted-foreground my-1 inline-flex max-w-full items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs">
        <span className="truncate">
          {filename ?? mediaType ?? "Attachment"} is unavailable
        </span>
      </div>
    );
  }

  return (
    <button
      className="border-border bg-muted/40 focus-visible:ring-ring my-1 block w-fit overflow-hidden rounded-lg border transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
      onClick={onClick}
      type="button"
    >
      <Image
        alt={filename ?? "attachment"}
        className={cn(
          "duration-slow block h-auto max-h-72 w-auto max-w-full transition-opacity motion-reduce:transition-none",
          hasLoaded ? "opacity-100" : "opacity-0"
        )}
        height={480}
        loading="eager"
        onError={() => setHasError(true)}
        onLoad={() => setHasLoaded(true)}
        src={url}
        unoptimized
        width={640}
      />
    </button>
  );
}
