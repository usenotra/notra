"use client";

import { Copy01Icon, Download01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ChatAttachment } from "@notra/ai/types/chat";
import { MIME_DISPLAY_LABELS } from "@notra/schemas/constants/dashboard/upload";
import { Button } from "@notra/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@notra/ui/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { Loader2Icon } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";

import {
  isImageMimeType,
  isPdfMimeType,
  isTextMimeType,
} from "@/lib/upload/mime";
import { copyImageToClipboard } from "@/utils/copy-image-to-clipboard";
import {
  buildImageDownloadFilename,
  downloadFileFromUrl,
} from "@/utils/download";
import { formatBytes } from "@/utils/format";

function TextPreview({ url }: { url: string }) {
  const { data: content, error } = useQuery({
    queryKey: ["attachment-text-preview", url],
    queryFn: async ({ signal }) => {
      const response = await fetch(url, { signal });
      if (!response.ok) {
        throw new Error(`Failed to load (${response.status})`);
      }
      return await response.text();
    },
    retry: false,
  });

  if (error) {
    return (
      <div className="text-destructive flex h-full items-center justify-center text-sm">
        {error.message}
      </div>
    );
  }

  if (content === undefined) {
    return (
      <div className="text-muted-foreground flex h-full items-center justify-center">
        <Loader2Icon className="size-4 animate-spin" />
      </div>
    );
  }

  return (
    <pre className="bg-muted/40 h-full overflow-auto rounded-md p-3 font-mono text-xs leading-relaxed break-words whitespace-pre-wrap">
      {content}
    </pre>
  );
}

type PreviewAttachment =
  | ChatAttachment
  | (Omit<ChatAttachment, "size" | "key"> & { size?: number; key?: string });

interface AttachmentPreviewDialogProps {
  attachment: PreviewAttachment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AttachmentPreviewDialog({
  attachment,
  open,
  onOpenChange,
}: AttachmentPreviewDialogProps) {
  const [isCopying, setIsCopying] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  if (!attachment) {
    return null;
  }

  const typeLabel =
    MIME_DISPLAY_LABELS[attachment.mediaType] ?? attachment.mediaType;
  const isImage = isImageMimeType(attachment.mediaType);
  const isPdf = isPdfMimeType(attachment.mediaType);
  const isText = isTextMimeType(attachment.mediaType);
  const canPreview = isImage || isPdf || isText;

  async function handleCopyImage() {
    if (!attachment) {
      return;
    }
    setIsCopying(true);
    try {
      await copyImageToClipboard(attachment.url);
      toast.success("Image copied");
    } catch {
      toast.error("Failed to copy image");
    }
    setIsCopying(false);
  }

  async function handleDownload() {
    if (!attachment) {
      return;
    }
    setIsDownloading(true);
    try {
      const filename = isImage
        ? buildImageDownloadFilename(attachment.filename, attachment.mediaType)
        : attachment.filename;
      await downloadFileFromUrl(attachment.url, filename);
      toast.success(isImage ? "Downloaded image" : "Downloaded file");
    } catch {
      window.open(attachment.url, "_blank", "noopener,noreferrer");
    }
    setIsDownloading(false);
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="flex h-[80vh] max-w-3xl flex-col gap-3 p-4 sm:max-w-3xl">
        <div className="flex min-w-0 items-start justify-between gap-3 pr-8">
          <div className="min-w-0">
            <DialogTitle className="truncate text-sm">
              {attachment.filename}
            </DialogTitle>
            <p className="text-muted-foreground mt-1 text-xs">
              {typeof attachment.size === "number"
                ? `${typeLabel} · ${formatBytes(attachment.size)}`
                : typeLabel}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            {isImage ? (
              <Button
                disabled={isCopying}
                onClick={handleCopyImage}
                size="sm"
                variant="outline"
              >
                <HugeiconsIcon icon={Copy01Icon} />
                Copy image
              </Button>
            ) : null}
            <Button
              disabled={isDownloading}
              onClick={handleDownload}
              size="sm"
              variant="outline"
            >
              <HugeiconsIcon icon={Download01Icon} />
              {isImage ? "Download image" : "Download"}
            </Button>
          </div>
        </div>
        <div className="border-border min-h-0 flex-1 overflow-hidden rounded-md border">
          {isImage ? (
            <div className="bg-muted/20 relative flex h-full w-full items-center justify-center">
              <Image
                alt={attachment.filename}
                className="h-full w-full object-contain"
                height={1200}
                src={attachment.url}
                unoptimized
                width={1200}
              />
            </div>
          ) : null}
          {isPdf ? (
            <iframe
              className="h-full w-full"
              referrerPolicy="no-referrer"
              sandbox="allow-scripts"
              src={attachment.url}
              title={attachment.filename}
            />
          ) : null}
          {isText ? <TextPreview url={attachment.url} /> : null}
          {canPreview ? null : (
            <div className="bg-muted/20 flex h-full flex-col items-center justify-center gap-1 px-6 text-center">
              <p className="text-sm font-medium">Preview isn't available</p>
              <p className="text-muted-foreground text-xs">
                Download this file to open it on your device.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
