"use client";

import {
  Delete02Icon,
  InformationCircleIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { AttachmentFilter } from "@notra/schemas/dashboard/attachments";
import {
  ResponsiveAlertDialog,
  ResponsiveAlertDialogAction,
  ResponsiveAlertDialogCancel,
  ResponsiveAlertDialogContent,
  ResponsiveAlertDialogDescription,
  ResponsiveAlertDialogFooter,
  ResponsiveAlertDialogHeader,
  ResponsiveAlertDialogTitle,
} from "@notra/ui/components/shared/responsive-alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@notra/ui/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LoaderCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/button";
import { AttachmentPreviewDialog } from "@/components/chat/attachment-preview";
import { Table } from "@/components/motion/table";
import { useOrganizationsContext } from "@/components/providers/organization-provider";
import { createAttachmentColumns } from "@/components/settings/attachments/attachment-columns";
import { SettingsPane } from "@/components/settings/settings-pane";
import {
  ATTACHMENT_FILTER_LABELS,
  ATTACHMENT_TABLE_ROW_HEIGHT,
  ATTACHMENT_TABLE_SKELETON_ROWS,
} from "@/constants/attachments";
import { dashboardOrpc } from "@/lib/orpc/query";
import type { AttachmentRow as AttachmentRowData } from "@/types/settings/attachments";
import { tableHeightFor } from "@/utils/table";

function AttachmentsInfoHint() {
  return (
    <Tooltip>
      <TooltipTrigger
        aria-label="Attachment deletion details"
        className="text-muted-foreground hover:text-foreground inline-flex cursor-help transition-colors"
      >
        <HugeiconsIcon className="size-3.5" icon={InformationCircleIcon} />
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        Deleting files here removes them from any threads that reference them,
        but does not delete the threads themselves. This may lead to unexpected
        behavior if the file is still in use.
      </TooltipContent>
    </Tooltip>
  );
}

export function AttachmentsSection() {
  const queryClient = useQueryClient();
  const { activeOrganization } = useOrganizationsContext();
  const [filter, setFilter] = useState<AttachmentFilter>("all");
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [confirmKeys, setConfirmKeys] = useState<string[] | null>(null);
  const [previewAttachment, setPreviewAttachment] =
    useState<AttachmentRowData | null>(null);

  const organizationId = activeOrganization?.id ?? "";

  const { data, isLoading, isError } = useQuery(
    dashboardOrpc.attachments.list.queryOptions({
      input: { filter, organizationId },
      enabled: Boolean(organizationId),
    })
  );

  const attachments: AttachmentRowData[] =
    data?.attachments?.map((row) => ({
      id: row.id,
      key: row.key,
      filename: row.filename,
      mediaType: row.mediaType,
      size: row.size,
      createdAt: new Date(row.createdAt),
      url: row.url,
    })) ?? [];

  const columns = createAttachmentColumns({
    pendingKey,
    onDelete: (key) => setConfirmKeys([key]),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: dashboardOrpc.attachments.list.key(),
    });

  const deleteManyMutation = useMutation({
    mutationFn: async (keys: string[]) => {
      await dashboardOrpc.attachments.deleteMany.call({ keys, organizationId });
    },
    onSuccess: async (_data, keys) => {
      toast.success(
        keys.length === 1
          ? "Attachment deleted"
          : `${keys.length} attachments deleted`
      );
      const deleted = new Set(keys);
      setSelectedKeys((prev) => prev.filter((key) => !deleted.has(key)));
      await invalidate();
    },
    onError: () => {
      toast.error("Failed to delete attachments");
    },
    onSettled: () => {
      setPendingKey(null);
      setConfirmKeys(null);
    },
  });

  const hasSelection = selectedKeys.length > 0;
  const confirmOpen = confirmKeys !== null;
  const tableRowCount = isLoading
    ? ATTACHMENT_TABLE_SKELETON_ROWS
    : Math.max(attachments.length, 4);

  return (
    <SettingsPane titleAccessory={<AttachmentsInfoHint />}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Select
          onValueChange={(value) => {
            setFilter(value as AttachmentFilter);
            setSelectedKeys([]);
          }}
          value={filter}
        >
          <SelectTrigger
            aria-label="Filter attachments"
            className="w-36"
            size="sm"
          >
            <SelectValue>
              {(value) =>
                ATTACHMENT_FILTER_LABELS[value as AttachmentFilter] ??
                ATTACHMENT_FILTER_LABELS.all
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(ATTACHMENT_FILTER_LABELS) as AttachmentFilter[]).map(
              (key) => (
                <SelectItem key={key} value={key}>
                  {ATTACHMENT_FILTER_LABELS[key]}
                </SelectItem>
              )
            )}
          </SelectContent>
        </Select>

        {hasSelection ? (
          <Button
            disabled={deleteManyMutation.isPending}
            onClick={() => setConfirmKeys(selectedKeys)}
            size="sm"
            variant="destructive"
          >
            {deleteManyMutation.isPending ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <HugeiconsIcon icon={Delete02Icon} size={16} />
            )}
            Delete {selectedKeys.length} selected
          </Button>
        ) : null}
      </div>

      <Table
        className="rounded-2xl"
        columns={columns}
        data={attachments}
        emptyState={
          isError ? "Couldn't load attachments" : "No attachments yet"
        }
        getRowId={(row) => row.key}
        height={tableHeightFor(tableRowCount, ATTACHMENT_TABLE_ROW_HEIGHT)}
        loading={isLoading}
        onRowClick={setPreviewAttachment}
        onSelectionChange={setSelectedKeys}
        rowHeight={ATTACHMENT_TABLE_ROW_HEIGHT}
        selectable
        selectedRowIds={selectedKeys}
        skeletonRows={ATTACHMENT_TABLE_SKELETON_ROWS}
      />

      <AttachmentPreviewDialog
        attachment={previewAttachment}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewAttachment(null);
          }
        }}
        open={previewAttachment !== null}
      />

      <ResponsiveAlertDialog
        onOpenChange={(open) => {
          if (!open) {
            setConfirmKeys(null);
          }
        }}
        open={confirmOpen}
      >
        <ResponsiveAlertDialogContent>
          <ResponsiveAlertDialogHeader>
            <ResponsiveAlertDialogTitle>
              {confirmKeys && confirmKeys.length > 1
                ? `Delete ${confirmKeys.length} attachments?`
                : "Delete this attachment?"}
            </ResponsiveAlertDialogTitle>
            <ResponsiveAlertDialogDescription>
              The file will be removed from storage and from any threads that
              reference it. This cannot be undone.
            </ResponsiveAlertDialogDescription>
          </ResponsiveAlertDialogHeader>
          <ResponsiveAlertDialogFooter>
            <ResponsiveAlertDialogCancel>Cancel</ResponsiveAlertDialogCancel>
            <ResponsiveAlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!confirmKeys) {
                  return;
                }
                if (confirmKeys.length === 1) {
                  setPendingKey(confirmKeys[0] ?? null);
                }
                deleteManyMutation.mutate(confirmKeys);
              }}
            >
              Delete
            </ResponsiveAlertDialogAction>
          </ResponsiveAlertDialogFooter>
        </ResponsiveAlertDialogContent>
      </ResponsiveAlertDialog>
    </SettingsPane>
  );
}
