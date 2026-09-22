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
      toast.success("Sitemap removed");
      setDeleteTargetId(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to remove sitemap"
      );
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
        actionLabel="Retry"
        description="We couldn't load this brand identity's sitemaps."
        onActionClick={() => refetch()}
        title="Sitemaps unavailable"
      />
    );
  }

  return (
    <div className="space-y-4">
      {sitemaps.length === 0 ? (
        <EmptyState
          actionIcon={<HugeiconsIcon className="size-4" icon={GlobalIcon} />}
          actionLabel="Add Sitemap"
          description="Add a sitemap to track indexed pages and monitor site health for AI discovery."
          onActionClick={() => onDialogOpenChange(true)}
          preview={
            <EmptyStateTablePreview
              columns={EMPTY_STATE_TABLE_COLUMNS.sitemap}
              rows={EMPTY_STATE_TABLE_ROWS}
            />
          }
          title="No sitemaps yet"
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
                <div className="flex items-center gap-1">
                  <SitemapSelector
                    onSelect={setSelectedSitemapId}
                    selectedSitemapId={selectedSitemap.id}
                    sitemaps={sitemaps}
                  />
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          aria-label="Sitemap actions"
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
                        Remove sitemap
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </SitemapPagesTable>
              <p className="text-muted-foreground text-xs tabular-nums">
                {selectedSitemap.indexedPages} of {selectedSitemap.totalPages}{" "}
                pages indexed
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
              Remove sitemap?
            </ResponsiveAlertDialogTitle>
            <ResponsiveAlertDialogDescription>
              This removes
              {deleteTarget ? ` ${deleteTarget.label}` : " this sitemap"} and
              its crawled pages from this brand identity.
            </ResponsiveAlertDialogDescription>
          </ResponsiveAlertDialogHeader>
          <ResponsiveAlertDialogFooter>
            <ResponsiveAlertDialogCancel disabled={deleteSitemap.isPending}>
              Cancel
            </ResponsiveAlertDialogCancel>
            <ResponsiveAlertDialogAction
              disabled={deleteSitemap.isPending}
              onClick={handleDelete}
              variant="destructive"
            >
              {deleteSitemap.isPending ? "Removing…" : "Remove Sitemap"}
            </ResponsiveAlertDialogAction>
          </ResponsiveAlertDialogFooter>
        </ResponsiveAlertDialogContent>
      </ResponsiveAlertDialog>
    </div>
  );
}
