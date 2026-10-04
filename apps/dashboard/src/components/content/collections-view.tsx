"use client";

import type { PostCollectionSummary } from "@notra/schemas/dashboard/content";
import { LogoStack } from "@notra/ui/components/geo/logo-stack";
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
import { TablePagination } from "@notra/ui/components/shared/table-pagination";
import { Badge } from "@notra/ui/components/ui/badge";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuTrigger,
} from "@notra/ui/components/ui/context-menu";
import {
  DataTable,
  type TableColumn,
} from "@notra/ui/components/ui/data-table";
import { formatDistanceToNowStrict } from "date-fns";
import { useState } from "react";
import { useNow, useTranslations } from "use-intl";

import {
  CollectionActionsMenu,
  CollectionMenuItems,
} from "@/components/content/collection-menu-items";
import Link from "@/components/framework/link";
import { StatusSpinner } from "@/components/geo/status-spinner";
import {
  COLLECTION_JUST_NOW_MS,
  COLLECTION_TABLE_ROW_HEIGHT,
  COLLECTION_TYPE_STACK_LIMIT,
} from "@/constants/content-collections";
import { useOutputTypeLabel } from "@/lib/hooks/use-output-type-label";
import { usePostActions } from "@/lib/hooks/use-post-actions";
import { useDateFnsLocale } from "@/lib/i18n/date-fns";
import { useLogoStackLabels } from "@/lib/i18n/use-logo-stack-labels";
import { useRouter } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import type {
  CollectionStatus,
  CollectionsViewProps,
} from "@/types/content/collection";
import {
  collectionMeta,
  collectionHref,
  collectionTitle,
  collectionStatus,
} from "@/utils/content-collections";
import { getOutputTypeIconClass, OutputTypeIcon } from "@/utils/output-types";
import { paginatedTableHeightFor } from "@/utils/table";

function statusVariant(
  status: CollectionStatus
): "secondary" | "outline" | "ghost" {
  if (status === "published") {
    return "secondary";
  }
  if (status === "empty") {
    return "ghost";
  }
  return "outline";
}

function CollectionStatusBadge({ status }: { status: CollectionStatus }) {
  const t = useTranslations("content.collections");
  return (
    <Badge
      className="inline-flex items-center gap-1.5 rounded-sm text-[0.6875rem] whitespace-nowrap"
      variant={statusVariant(status)}
    >
      {status === "generating" ? <StatusSpinner /> : null}
      {t("status", { status })}
    </Badge>
  );
}

function CollectionTypesCell({ contentTypes }: { contentTypes: string[] }) {
  const outputTypeLabel = useOutputTypeLabel();
  const logoStackLabels = useLogoStackLabels();
  const t = useTranslations("content.collections");
  const singleType = contentTypes.length === 1 ? contentTypes[0] : null;
  if (singleType) {
    return (
      <span className="text-muted-foreground inline-flex items-center gap-2 text-xs">
        <OutputTypeIcon
          className={`size-4 shrink-0 ${getOutputTypeIconClass(singleType)}`}
          outputType={singleType}
        />
        {outputTypeLabel(singleType)}
      </span>
    );
  }
  return (
    <span className="text-muted-foreground inline-flex items-center gap-2 text-xs">
      <LogoStack
        labels={logoStackLabels}
        items={contentTypes.map((type) => ({
          key: type,
          label: outputTypeLabel(type),
          renderIcon: (className) => (
            <OutputTypeIcon
              className={`${className} ${getOutputTypeIconClass(type)}`}
              outputType={type}
            />
          ),
        }))}
        limit={COLLECTION_TYPE_STACK_LIMIT}
      />
      {contentTypes.length > 1 ? (
        <span>{t("formats", { count: contentTypes.length })}</span>
      ) : null}
    </span>
  );
}

function CollectionNameCell({
  collection,
}: {
  collection: PostCollectionSummary;
}) {
  const t = useTranslations("content.collections");
  return (
    <span className="flex min-w-0 flex-col gap-0.5">
      <span className="truncate text-sm leading-snug font-medium">
        {collectionTitle(collection)}
      </span>
      <span className="text-muted-foreground truncate text-xs tabular-nums">
        {collectionMeta(collection, t)}
      </span>
    </span>
  );
}

export function CollectionsView({
  collections,
  pagination,
  organizationId,
  organizationSlug,
  view,
  loading = false,
}: CollectionsViewProps) {
  const router = useRouter();
  const t = useTranslations("content.collections");
  const tCommon = useTranslations("common");
  const [deleteTarget, setDeleteTarget] =
    useState<PostCollectionSummary | null>(null);
  const { deleteCollection, isDeleting } = usePostActions(organizationId);
  const menuProps = {
    organizationSlug,
    disabled: isDeleting,
    onDelete: setDeleteTarget,
  };
  const deleteDialog = (
    <ResponsiveAlertDialog
      onOpenChange={(open) => {
        if (!(open || isDeleting)) {
          setDeleteTarget(null);
        }
      }}
      open={deleteTarget !== null}
    >
      <ResponsiveAlertDialogContent>
        <ResponsiveAlertDialogHeader>
          <ResponsiveAlertDialogTitle>
            {deleteTarget?.postCount === 1
              ? tCommon("labels.deletePost")
              : t("actions.deleteTitle")}
          </ResponsiveAlertDialogTitle>
          <ResponsiveAlertDialogDescription>
            {deleteTarget?.postCount === 1
              ? tCommon("messages.thisWillPermanentlyDeleteTitle", {
                  title: collectionTitle(deleteTarget),
                })
              : t("actions.deleteDescription", {
                  title: deleteTarget ? collectionTitle(deleteTarget) : "",
                  count: deleteTarget?.postCount ?? 0,
                })}
          </ResponsiveAlertDialogDescription>
        </ResponsiveAlertDialogHeader>
        <ResponsiveAlertDialogFooter>
          <ResponsiveAlertDialogCancel disabled={isDeleting}>
            {tCommon("actions.cancel")}
          </ResponsiveAlertDialogCancel>
          <ResponsiveAlertDialogAction
            disabled={isDeleting}
            onClick={async () => {
              if (!deleteTarget || isDeleting) {
                return;
              }
              const deleted = await deleteCollection(deleteTarget.id);
              if (deleted) {
                setDeleteTarget(null);
                if (collections.length === 1 && pagination.page > 1) {
                  void pagination.setPage(pagination.page - 1);
                }
              }
            }}
            variant="destructive"
          >
            {isDeleting
              ? tCommon("actions.deleting")
              : tCommon("actions.delete")}
          </ResponsiveAlertDialogAction>
        </ResponsiveAlertDialogFooter>
      </ResponsiveAlertDialogContent>
    </ResponsiveAlertDialog>
  );
  const dateFnsLocale = useDateFnsLocale();
  const now = useNow();
  const formatRelativeDate = (dateString: string) => {
    const date = new Date(dateString);
    // date-fns has no "just now"; it would print "0 seconds ago".
    if (Math.abs(now.getTime() - date.getTime()) < COLLECTION_JUST_NOW_MS) {
      return tCommon("time.justNow");
    }
    return formatDistanceToNowStrict(date, {
      addSuffix: true,
      locale: dateFnsLocale,
    });
  };
  const collectionColumns: TableColumn<PostCollectionSummary>[] = [
    {
      key: "types",
      header: tCommon("labels.format"),
      width: "10rem",
      collapsePriority: 2,
      cell: (collection) => (
        <CollectionTypesCell contentTypes={collection.contentTypes} />
      ),
    },
    {
      key: "status",
      header: tCommon("labels.status"),
      width: "8rem",
      collapsePriority: 1,
      cell: (collection) => (
        <CollectionStatusBadge status={collectionStatus(collection)} />
      ),
    },
    {
      key: "createdAt",
      header: tCommon("labels.created"),
      width: "8.5rem",
      collapsePriority: 3,
      cell: (collection) => (
        <span
          className="text-muted-foreground whitespace-nowrap tabular-nums"
          suppressHydrationWarning
        >
          {formatRelativeDate(collection.createdAt)}
        </span>
      ),
    },
  ];
  const columns: TableColumn<PostCollectionSummary>[] = [
    {
      key: "name",
      header: tCommon("labels.contentSingular"),
      width: "1fr",
      minWidth: "14rem",
      cell: (collection) => (
        <Link
          className="focus-visible:ring-ring block min-w-0 rounded-sm focus-visible:ring-2 focus-visible:outline-none"
          href={collectionHref(organizationSlug, collection)}
          prefetch={false}
          title={collectionTitle(collection)}
        >
          <CollectionNameCell collection={collection} />
        </Link>
      ),
    },
    ...collectionColumns,
    {
      key: "actions",
      header: <span className="sr-only">{tCommon("labels.actions")}</span>,
      width: "4rem",
      minWidth: "4rem",
      align: "right",
      cell: (collection) => (
        <CollectionActionsMenu collection={collection} {...menuProps} />
      ),
    },
  ];

  if (view === "grid") {
    return (
      <div
        aria-busy={loading || undefined}
        className={cn(
          "space-y-4",
          loading &&
            "pointer-events-none opacity-60 transition-opacity duration-200 motion-reduce:transition-none"
        )}
        inert={loading ? true : undefined}
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {collections.map((collection) => (
            <ContextMenu key={collection.id}>
              <ContextMenuTrigger
                render={
                  <div className="border-border/60 bg-background hover:bg-muted/40 relative min-w-0 rounded-xl border transition-colors" />
                }
              >
                <Link
                  className="focus-visible:ring-ring flex h-full min-w-0 flex-col gap-4 rounded-xl p-4 focus-visible:ring-2 focus-visible:outline-none"
                  href={collectionHref(organizationSlug, collection)}
                  prefetch={false}
                  title={collectionTitle(collection)}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CollectionTypesCell
                      contentTypes={collection.contentTypes}
                    />
                    <div className="pr-9">
                      <CollectionStatusBadge
                        status={collectionStatus(collection)}
                      />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <p className="line-clamp-2 text-sm leading-snug font-medium wrap-anywhere">
                      {collectionTitle(collection)}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {collectionMeta(collection, t)}
                    </p>
                  </div>
                  <time
                    className="text-muted-foreground text-xs"
                    dateTime={collection.createdAt}
                    suppressHydrationWarning
                  >
                    {formatRelativeDate(collection.createdAt)}
                  </time>
                </Link>
                <div className="absolute top-2.5 right-2.5">
                  <CollectionActionsMenu
                    collection={collection}
                    {...menuProps}
                  />
                </div>
              </ContextMenuTrigger>
              <ContextMenuContent className="w-48">
                <CollectionMenuItems collection={collection} {...menuProps} />
              </ContextMenuContent>
            </ContextMenu>
          ))}
        </div>
        {collections.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center text-sm">
            {t("emptyPage")}
          </p>
        ) : null}
        <TablePagination
          {...pagination}
          itemLabel={t("items", { count: pagination.totalItems })}
        />
        {deleteDialog}
      </div>
    );
  }

  return (
    <>
      <DataTable
        columns={columns}
        data={collections}
        emptyState={t("emptyPage")}
        pagination={{
          mode: "server",
          page: pagination.page,
          pageSize: pagination.pageSize,
          totalItems: pagination.totalItems,
          onPageChange: pagination.setPage,
          onPageSizeChange: pagination.onPageSizeChange,
          itemLabel: t("items", { count: pagination.totalItems }),
        }}
        getRowId={(collection) => collection.id}
        height={paginatedTableHeightFor(
          pagination.pageRowCount,
          COLLECTION_TABLE_ROW_HEIGHT
        )}
        loading={loading}
        onRowClick={(collection) =>
          router.push(collectionHref(organizationSlug, collection))
        }
        onRowPointerEnter={(collection) =>
          router.prefetch(collectionHref(organizationSlug, collection))
        }
        rowHeight={COLLECTION_TABLE_ROW_HEIGHT}
        renderRowContextMenu={(collection) => (
          <CollectionMenuItems collection={collection} {...menuProps} />
        )}
      />
      {deleteDialog}
    </>
  );
}
