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
import { useTranslations } from "use-intl";

import { Button } from "@/components/button";
import { AttachmentPreviewDialog } from "@/components/chat/attachment-preview";
import { Table } from "@/components/motion/table";
import { useOrganizationsContext } from "@/components/providers/organization-provider";
import { createAttachmentColumns } from "@/components/settings/attachments/attachment-columns";
import { SettingsPane } from "@/components/settings/settings-pane";
import {
  ATTACHMENT_FILTERS,
  ATTACHMENT_TABLE_ROW_HEIGHT,
  ATTACHMENT_TABLE_SKELETON_ROWS,
} from "@/constants/attachments";
import { useDateFnsLocale } from "@/lib/i18n/date-fns";
import { dashboardOrpc } from "@/lib/orpc/query";
import type { AttachmentRow as AttachmentRowData } from "@/types/settings/attachments";
import { tableHeightFor } from "@/utils/table";

function AttachmentsInfoHint() {
  const t = useTranslations("settings.attachments");

  return (
    <Tooltip>
      <TooltipTrigger
        aria-label={t("infoAria")}
        className="text-muted-foreground hover:text-foreground inline-flex cursor-help transition-colors"
      >
        <HugeiconsIcon className="size-3.5" icon={InformationCircleIcon} />
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">{t("infoTooltip")}</TooltipContent>
    </Tooltip>
  );
}

export function AttachmentsSection() {
  const t = useTranslations("settings.attachments");
  const tCommon = useTranslations("common.actions");
  const tCommonRoot = useTranslations("common");
  const tSettingsShared = useTranslations("settings.shared");
  const filterLabels: Record<(typeof ATTACHMENT_FILTERS)[number], string> = {
    all: t("filters.all"),
    image: t("filters.image"),
    pdf: t("filters.pdf"),
    text: tSettingsShared("text"),
    other: tCommonRoot("labels.other"),
  };
  const dateLocale = useDateFnsLocale();
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
    t,
    tSettingsShared,
    tCommon: tCommonRoot,
    deleteLabel: tCommon("delete"),
    dateLocale,
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
      toast.success(t("deleted", { count: keys.length }));
      const deleted = new Set(keys);
      setSelectedKeys((prev) => prev.filter((key) => !deleted.has(key)));
      await invalidate();
    },
    onError: () => {
      toast.error(t("deleteFailed"));
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
            setFilter(
              ATTACHMENT_FILTERS.find((filterKey) => filterKey === value) ??
                "all"
            );
            setSelectedKeys([]);
          }}
          value={filter}
        >
          <SelectTrigger
            aria-label={t("filterAria")}
            className="w-36"
            size="sm"
          >
            <SelectValue>
              {(value) =>
                filterLabels[
                  ATTACHMENT_FILTERS.find((filterKey) => filterKey === value) ??
                    "all"
                ]
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {ATTACHMENT_FILTERS.map((key) => (
              <SelectItem key={key} value={key}>
                {filterLabels[key]}
              </SelectItem>
            ))}
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
            {t("deleteSelected", { count: selectedKeys.length })}
          </Button>
        ) : null}
      </div>

      <Table
        className="rounded-2xl"
        columns={columns}
        data={attachments}
        emptyState={isError ? t("loadFailed") : t("empty")}
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
              {t("confirmTitle", { count: confirmKeys?.length ?? 1 })}
            </ResponsiveAlertDialogTitle>
            <ResponsiveAlertDialogDescription>
              {t("confirmDescription")}
            </ResponsiveAlertDialogDescription>
          </ResponsiveAlertDialogHeader>
          <ResponsiveAlertDialogFooter>
            <ResponsiveAlertDialogCancel>
              {tCommon("cancel")}
            </ResponsiveAlertDialogCancel>
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
              {tCommon("delete")}
            </ResponsiveAlertDialogAction>
          </ResponsiveAlertDialogFooter>
        </ResponsiveAlertDialogContent>
      </ResponsiveAlertDialog>
    </SettingsPane>
  );
}
