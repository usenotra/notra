"use client";

import { Button } from "@notra/ui/components/ui/button";
import { useTranslations } from "next-intl";
import { parseAsInteger, useQueryState } from "nuqs";
import { useMemo } from "react";

import { CollectionsPageSkeleton } from "@/app/(dashboard)/[slug]/content/skeleton";
import { CollectionsView } from "@/components/content/collections-view";
import { EmptyState } from "@/components/empty-state";
import { EmptyStateTablePreview } from "@/components/empty-state-preview";
import {
  EMPTY_STATE_TABLE_COLUMNS,
  EMPTY_STATE_TABLE_ROWS,
} from "@/constants/empty-state";
import { useCollections } from "@/lib/hooks/use-collections";
import type { ContentCollectionsSectionProps } from "@/types/content/collection";
import type { TablePaginationState } from "@/types/table";

/** The content page's list and grid views of collections. */
export function ContentCollectionsSection({
  organizationId,
  organizationSlug,
  initialProjectId,
  view,
  toolbarEnd,
}: ContentCollectionsSectionProps) {
  const t = useTranslations("content.list");
  const tCommon = useTranslations("common.actions");
  const [rawPage, setPage] = useQueryState(
    "page",
    parseAsInteger.withDefault(1).withOptions({ clearOnDefault: true })
  );
  const page = Math.max(1, rawPage);

  const { data, isPending, isError, isPlaceholderData, refetch } =
    useCollections(organizationId, page, initialProjectId);

  const collections = useMemo(
    () => data?.collections ?? [],
    [data?.collections]
  );

  const pageCount = data?.pagination.totalPages ?? 1;
  const pagination: TablePaginationState = {
    page,
    pageCount,
    pageSize: data?.pagination.pageSize ?? collections.length,
    totalItems: data?.pagination.totalCount ?? collections.length,
    pageRowCount: collections.length,
    setPage: (next) => setPage(Math.min(Math.max(1, next), pageCount)),
  };

  const isEmpty =
    !(isPending || isError) && collections.length === 0 && page === 1;

  return (
    <div className="space-y-3">
      <div className="flex min-h-8 flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-medium">{t("allContent")}</h2>
        {toolbarEnd}
      </div>

      {isPending ? <CollectionsPageSkeleton view={view} /> : null}

      {isError ? (
        <EmptyState
          action={
            <Button
              onClick={() => {
                void refetch();
              }}
              variant="outline"
            >
              {tCommon("tryAgain")}
            </Button>
          }
          description={t("loadFailedDescription")}
          title={t("loadFailedTitle")}
        />
      ) : null}

      {isEmpty ? (
        <EmptyState
          description={t("emptyDescription")}
          preview={
            <EmptyStateTablePreview
              columns={EMPTY_STATE_TABLE_COLUMNS.content}
              rows={EMPTY_STATE_TABLE_ROWS}
            />
          }
          title={t("emptyTitle")}
        />
      ) : null}

      {isPending || isEmpty || isError ? null : (
        <CollectionsView
          collections={collections}
          loading={isPlaceholderData}
          organizationId={organizationId}
          organizationSlug={organizationSlug}
          pagination={pagination}
          view={view}
        />
      )}
    </div>
  );
}
