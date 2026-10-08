"use client";

import { Button } from "@notra/ui/components/ui/button";
import { normalizePageSize } from "@notra/ui/lib/data-table";
import { parseAsInteger, useQueryState } from "nuqs";
import { useMemo } from "react";
import { useTranslations } from "use-intl";

import { CollectionsPageSkeleton } from "@/app/(dashboard)/[slug]/content/skeleton";
import { CollectionsView } from "@/components/content/collections-view";
import { EmptyState } from "@/components/empty-state";
import { EmptyStateTablePreview } from "@/components/empty-state-preview";
import { COLLECTIONS_PAGE_SIZE } from "@/constants/content-collections";
import {
  EMPTY_STATE_TABLE_COLUMNS,
  EMPTY_STATE_TABLE_ROWS,
} from "@/constants/empty-state";
import { useCollections } from "@/lib/hooks/use-collections";
import type { ContentCollectionsSectionProps } from "@/types/content/collection";
import type { TablePaginationState } from "@/types/table";

/** The content page's table of collections. */
export function ContentCollectionsSection({
  organizationId,
  organizationSlug,
  initialProjectId,
}: ContentCollectionsSectionProps) {
  const t = useTranslations("content.list");
  const tCommon = useTranslations("common.actions");
  const [rawPage, setPage] = useQueryState(
    "page",
    parseAsInteger.withDefault(1).withOptions({ clearOnDefault: true })
  );
  const page = Math.max(1, rawPage);
  const [rawPageSize, setPageSize] = useQueryState(
    "pageSize",
    parseAsInteger
      .withDefault(COLLECTIONS_PAGE_SIZE)
      .withOptions({ clearOnDefault: true })
  );
  // The URL is untrusted: snap it to an offered size before it drives paging
  // or a request with a bounded limit.
  const pageSize = normalizePageSize(rawPageSize, COLLECTIONS_PAGE_SIZE);

  const { data, isPending, isError, isPlaceholderData, refetch } =
    useCollections(organizationId, page, pageSize, initialProjectId);

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
    onPageSizeChange: (next) => {
      void setPageSize(next);
      void setPage(1);
    },
  };

  const isEmpty =
    !(isPending || isError) && collections.length === 0 && page === 1;

  return (
    <div className="space-y-3">
      {isPending ? <CollectionsPageSkeleton /> : null}

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
        />
      )}
    </div>
  );
}
