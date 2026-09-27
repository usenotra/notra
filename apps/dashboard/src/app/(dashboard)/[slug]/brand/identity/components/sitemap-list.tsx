"use client";

import {
  Delete02Icon,
  GlobalIcon,
  MoreVerticalIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@notra/ui/components/ui/dropdown-menu";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/button";
import { EmptyState } from "@/components/empty-state";
import { EmptyStateTablePreview } from "@/components/empty-state-preview";
import {
  EMPTY_STATE_TABLE_COLUMNS,
  EMPTY_STATE_TABLE_ROWS,
} from "@/constants/empty-state";
import { useDeleteSitemap, useSitemaps } from "@/lib/hooks/use-brand-sitemaps";
import type { SitemapListProps } from "@/types/hooks/brand-sitemaps";

import { AddSitemapDialog } from "./add-sitemap-dialog";
import { SitemapPagesTable } from "./sitemap-pages-table";
import { SitemapSelector } from "./sitemap-selector";

export function SitemapList({
  organizationId,
  voiceId,
  voiceWebsiteUrl,
  dialogOpen,
  onDialogOpenChange,
}: SitemapListProps) {
  const t = useTranslations("brand.sitemap.list");
  const tBrandShared = useTranslations("brand.shared");
  const tCommon2 = useTranslations("common");
  const tCommon = useTranslations("common.actions");
  const { data, isError, isPending, refetch } = useSitemaps(
    organizationId,
    voiceId
  );
  const deleteSitemap = useDeleteSitemap(organizationId, voiceId);
  const sitemaps = data?.sitemaps ?? [];

  const [selectedSitemapId, setSelectedSitemapId] = useState<string | null>(
    null
  );
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const selectedSitemap =
    sitemaps.find((sitemap) => sitemap.id === selectedSitemapId) ??
    sitemaps.at(0) ??
    null;
  const deleteTarget =
    sitemaps.find((sitemap) => sitemap.id === deleteTargetId) ?? null;

  const handleDelete = async () => {
    if (!deleteTarget) {
      return;
    }
    try {
      await deleteSitemap.mutateAsync(deleteTarget.id);
      toast.success(t("removed"));
      setDeleteTargetId(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("removeFailed"));
    }
  };

  if (isPending) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-8 w-64" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <EmptyState
        actionIcon={<HugeiconsIcon className="size-4" icon={GlobalIcon} />}
        actionLabel={tCommon("retry")}
        description={t("loadErrorDescription")}
        onActionClick={() => refetch()}
        title={t("loadErrorTitle")}
      />
    );
  }

  return (
    <div className="space-y-4">
      {sitemaps.length === 0 ? (
        <EmptyState
          actionIcon={<HugeiconsIcon className="size-4" icon={GlobalIcon} />}
          actionLabel={tBrandShared("addSitemap")}
          description={t("emptyDescription")}
          onActionClick={() => onDialogOpenChange(true)}
          preview={
            <EmptyStateTablePreview
              columns={EMPTY_STATE_TABLE_COLUMNS.sitemap}
              rows={EMPTY_STATE_TABLE_ROWS}
            />
          }
          title={t("emptyTitle")}
        />
      ) : (
        <>
          {selectedSitemap ? (
            <div className="space-y-3">
              <SitemapPagesTable
                organizationId={organizationId}
                sitemapId={selectedSitemap.id}
                voiceId={voiceId}
              >
                <div className="flex max-w-full min-w-0 items-center gap-1">
                  <SitemapSelector
                    onSelect={setSelectedSitemapId}
                    selectedSitemapId={selectedSitemap.id}
                    sitemaps={sitemaps}
                  />
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          aria-label={t("actions")}
                          size="icon-sm"
                          variant="ghost"
                        />
                      }
                    >
                      <HugeiconsIcon
                        className="size-4"
                        icon={MoreVerticalIcon}
                      />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => setDeleteTargetId(selectedSitemap.id)}
                        variant="destructive"
                      >
                        <HugeiconsIcon className="size-4" icon={Delete02Icon} />
                        {t("remove")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </SitemapPagesTable>
              <p className="text-muted-foreground text-xs tabular-nums">
                {t("indexedPages", {
                  indexed: selectedSitemap.indexedPages,
                  total: selectedSitemap.totalPages,
                })}
              </p>
            </div>
          ) : null}
        </>
      )}

      <AddSitemapDialog
        onOpenChange={onDialogOpenChange}
        open={dialogOpen}
        organizationId={organizationId}
        voiceId={voiceId}
        voiceWebsiteUrl={voiceWebsiteUrl}
      />

      <ResponsiveAlertDialog
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTargetId(null);
          }
        }}
        open={!!deleteTargetId}
      >
        <ResponsiveAlertDialogContent>
          <ResponsiveAlertDialogHeader>
            <ResponsiveAlertDialogTitle>
              {t("removeTitle")}
            </ResponsiveAlertDialogTitle>
            <ResponsiveAlertDialogDescription className="wrap-anywhere">
              {deleteTarget
                ? t("removeDescriptionNamed", { label: deleteTarget.label })
                : t("removeDescription")}
            </ResponsiveAlertDialogDescription>
          </ResponsiveAlertDialogHeader>
          <ResponsiveAlertDialogFooter>
            <ResponsiveAlertDialogCancel disabled={deleteSitemap.isPending}>
              {tCommon("cancel")}
            </ResponsiveAlertDialogCancel>
            <ResponsiveAlertDialogAction
              disabled={deleteSitemap.isPending}
              onClick={handleDelete}
              variant="destructive"
            >
              {deleteSitemap.isPending
                ? tCommon2("labels.removing")
                : t("removeConfirm")}
            </ResponsiveAlertDialogAction>
          </ResponsiveAlertDialogFooter>
        </ResponsiveAlertDialogContent>
      </ResponsiveAlertDialog>
    </div>
  );
}
