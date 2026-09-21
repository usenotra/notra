"use client";

import { GridViewIcon, ListViewIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@notra/ui/components/ui/button";
import { parseAsInteger, parseAsStringLiteral, useQueryState } from "nuqs";
import { useMemo } from "react";

import { CollectionsView } from "@/components/content/collections-view";
import { LazyCreateContentDialog } from "@/components/content/lazy-create-content-dialog";
import { EmptyState } from "@/components/empty-state";
import { EmptyStateTablePreview } from "@/components/empty-state-preview";
import { PageContainer } from "@/components/layout/container";
import { useOrganizationsContext } from "@/components/providers/organization-provider";
import { CONTENT_COLLECTION_VIEWS } from "@/constants/content-collections";
import {
  EMPTY_STATE_TABLE_COLUMNS,
  EMPTY_STATE_TABLE_ROWS,
} from "@/constants/empty-state";
import { useCollections } from "@/lib/hooks/use-collections";
import type { ContentListPageClientProps } from "@/types/content/collection";
import type { TablePaginationState } from "@/types/table";

import { CollectionsPageSkeleton } from "./skeleton";

export default function PageClient({
  organizationSlug,
}: ContentListPageClientProps) {
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
  const [view, setView] = useQueryState(
    "view",
    parseAsStringLiteral(CONTENT_COLLECTION_VIEWS).withDefault("list")
  );

  const { data, isPending, isError, refetch } = useCollections(
    organizationId,
    page
  );

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
    <PageContainer className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="w-full space-y-6 px-4 lg:px-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">Content</h1>
            <p className="text-muted-foreground max-w-2xl text-sm text-pretty">
              Posts and collections in one place.
            </p>
          </div>
          <LazyCreateContentDialog
            entry="content_list"
            organizationId={organizationId}
            organizationSlug={organizationSlug}
          />
        </header>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-medium">All content</h2>
          <div
            aria-label="Content view"
            className="bg-muted inline-flex items-center gap-0.5 rounded-lg p-0.5"
            role="group"
          >
            {CONTENT_COLLECTION_VIEWS.map((option) => (
              <Button
                aria-pressed={view === option}
                key={option}
                onClick={() => {
                  void setView(option);
                }}
                size="sm"
                variant={view === option ? "outline" : "ghost"}
              >
                <HugeiconsIcon
                  aria-hidden="true"
                  className="size-3.5"
                  icon={option === "list" ? ListViewIcon : GridViewIcon}
                />
                {option === "list" ? "List" : "Grid"}
              </Button>
            ))}
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
                Try again
              </Button>
            }
            description="Please try loading your content again."
            title="Couldn't load content"
          />
        ) : null}

        {isEmpty ? (
          <EmptyState
            description="Start with New post to write from scratch, or Generate content to use your sources."
            preview={
              <EmptyStateTablePreview
                columns={EMPTY_STATE_TABLE_COLUMNS.content}
                rows={EMPTY_STATE_TABLE_ROWS}
              />
            }
            title="No content yet"
          />
        ) : null}

        {!(isPending || isEmpty || isError) ? (
          <CollectionsView
            collections={collections}
            organizationSlug={organizationSlug}
            pagination={pagination}
            view={view}
          />
        ) : null}
      </div>
    </PageContainer>
  );
}
