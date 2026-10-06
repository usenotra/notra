"use client";

import { GridViewIcon, ListViewIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { PageHeading } from "@notra/ui/components/shared/page-heading";
import { Button } from "@notra/ui/components/ui/button";
import { normalizePageSize } from "@notra/ui/lib/data-table";
import { parseAsInteger, parseAsStringLiteral, useQueryState } from "nuqs";
import { useMemo } from "react";
import { useTranslations } from "use-intl";

import { CollectionsView } from "@/components/content/collections-view";
import { LazyCreateContentDialog } from "@/components/content/lazy-create-content-dialog";
import { EmptyState } from "@/components/empty-state";
import { EmptyStateTablePreview } from "@/components/empty-state-preview";
import { PageContainer } from "@/components/layout/container";
import { useOrganizationsContext } from "@/components/providers/organization-provider";
import {
  CONTENT_COLLECTION_VIEWS,
  COLLECTIONS_PAGE_SIZE,
} from "@/constants/content-collections";
import {
  EMPTY_STATE_TABLE_COLUMNS,
  EMPTY_STATE_TABLE_ROWS,
} from "@/constants/empty-state";
import { useCollections } from "@/lib/hooks/use-collections";
import { cn } from "@/lib/utils";
import type { ContentListPageClientProps } from "@/types/content/collection";
import type { TablePaginationState } from "@/types/table";

import { CollectionsPageSkeleton } from "./skeleton";

export default function PageClient({
  organizationSlug,
  initialProjectId,
}: ContentListPageClientProps) {
  const t = useTranslations("content.list");
  const tCommon2 = useTranslations("common");
  const tCommon = useTranslations("common.actions");
  const { getOrganization, activeOrganization } = useOrganizationsContext();
  const orgFromList = getOrganization(organizationSlug);
  const organization =
    activeOrganization?.slug === organizationSlug
      ? activeOrganization
      : orgFromList;
  const organizationId = organization?.id ?? "";

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
  const [view, setView] = useQueryState(
    "view",
    parseAsStringLiteral(CONTENT_COLLECTION_VIEWS).withDefault("list")
  );

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
    <PageContainer className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="w-full space-y-6 px-4 lg:px-6">
        <PageHeading
          description={t("description")}
          title={tCommon2("labels.content")}
        >
          <LazyCreateContentDialog
            entry="content_list"
            organizationId={organizationId}
            organizationSlug={organizationSlug}
          />
        </PageHeading>

        <div className="space-y-3">
          <div className="flex min-h-8 flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-medium">{t("allContent")}</h2>
            <div
              aria-label={t("viewToggle")}
              className="bg-muted inline-flex items-center rounded-lg p-0.5"
              role="group"
            >
              {CONTENT_COLLECTION_VIEWS.map((option) => {
                const selected = view === option;

                return (
                  <button
                    aria-pressed={selected}
                    className={cn(
                      "focus-visible:ring-ring/50 duration-fast inline-flex h-7 items-center gap-1 rounded-md px-2 text-[0.8rem] font-medium transition-colors ease-out focus-visible:ring-2 focus-visible:outline-none",
                      selected
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    key={option}
                    onClick={() => {
                      void setView(option);
                    }}
                    type="button"
                  >
                    <HugeiconsIcon
                      aria-hidden="true"
                      className="size-3.5"
                      icon={option === "list" ? ListViewIcon : GridViewIcon}
                    />
                    {option === "list"
                      ? tCommon2("labels.list")
                      : t("viewGrid")}
                  </button>
                );
              })}
            </div>
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

          {!(isPending || isEmpty || isError) ? (
            <CollectionsView
              collections={collections}
              loading={isPlaceholderData}
              organizationId={organizationId}
              organizationSlug={organizationSlug}
              pagination={pagination}
              view={view}
            />
          ) : null}
        </div>
      </div>
    </PageContainer>
  );
}
