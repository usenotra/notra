"use client";

import { Delete02Icon, File02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { MIME_DISPLAY_LABELS } from "@notra/schemas/constants/dashboard/upload";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";

import { Button } from "@/components/button";
import type { TableColumn } from "@/components/motion/table";
import {
  isImageMimeType,
  isPdfMimeType,
  isTextMimeType,
} from "@/lib/upload/mime";
import type {
  AttachmentRow,
  AttachmentTableColumnOptions,
} from "@/types/settings/attachments";
import { formatRelativeDate } from "@/utils/content-preview";
import { formatBytes } from "@/utils/format";

export function createAttachmentColumns({
  pendingKey,
  onDelete,
  t,
  tSettingsShared,
  tCommon,
  deleteLabel,
  dateLocale,
}: AttachmentTableColumnOptions): TableColumn<AttachmentRow>[] {
  function fileKindLabel(mediaType: string): string {
    if (isPdfMimeType(mediaType)) {
      return "PDF";
    }
    if (isTextMimeType(mediaType)) {
      return MIME_DISPLAY_LABELS[mediaType] ?? tSettingsShared("text");
    }
    if (isImageMimeType(mediaType)) {
      return MIME_DISPLAY_LABELS[mediaType] ?? tCommon("labels.image");
    }
    return MIME_DISPLAY_LABELS[mediaType] ?? tSettingsShared("file");
  }

  return [
    {
      key: "filename",
      header: tSettingsShared("file"),
      width: "1fr",
      minWidth: "12rem",
      sortable: true,
      sortValue: (row) => row.filename.toLowerCase(),
      cell: (row) => (
        <span className="flex min-w-0 items-center gap-2.5">
          <span className="bg-muted text-muted-foreground flex size-7 shrink-0 items-center justify-center rounded-md">
            <HugeiconsIcon className="size-3.5" icon={File02Icon} />
          </span>
          <span className="truncate font-medium" title={row.filename}>
            {row.filename}
          </span>
        </span>
      ),
    },
    {
      key: "mediaType",
      header: tCommon("labels.type"),
      width: "7rem",
      sortable: true,
      sortValue: (row) => fileKindLabel(row.mediaType),
      cell: (row) => (
        <span className="text-muted-foreground">
          {fileKindLabel(row.mediaType)}
        </span>
      ),
    },
    {
      key: "size",
      header: tCommon("labels.size"),
      width: "6.5rem",
      sortable: true,
      sortValue: (row) => row.size,
      cell: (row) => (
        <span className="text-muted-foreground tabular-nums">
          {formatBytes(row.size, dateLocale.code)}
        </span>
      ),
    },
    {
      key: "createdAt",
      header: t("columns.uploaded"),
      width: "8rem",
      sortable: true,
      sortValue: (row) => row.createdAt.getTime(),
      cell: (row) => (
        <span className="text-muted-foreground whitespace-nowrap tabular-nums">
          {formatRelativeDate(row.createdAt.toISOString(), dateLocale)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      width: "3.5rem",
      minWidth: "3.5rem",
      cell: (row) => {
        const pending = pendingKey === row.key;
        return (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  aria-label={t("deleteFile", { filename: row.filename })}
                  className="text-muted-foreground hover:text-destructive"
                  loading={pending}
                  onClick={() => onDelete(row.key)}
                  size="icon-sm"
                  variant="ghost"
                >
                  <HugeiconsIcon icon={Delete02Icon} size={14} />
                </Button>
              }
            />
            <TooltipContent>{deleteLabel}</TooltipContent>
          </Tooltip>
        );
      },
    },
  ];
}
