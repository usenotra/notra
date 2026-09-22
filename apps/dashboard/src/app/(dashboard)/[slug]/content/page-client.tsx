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
import { cn } from "@/lib/utils";
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
        <header className="flex flex-col items-start gap-3 @min-[40rem]/main:flex-row @min-[40rem]/main:items-center @min-[40rem]/main:justify-between">
          <div className="min-w-0 space-y-1">
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

        <div className="space-y-3">
          <div className="flex min-h-8 flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-medium">All content</h2>
            <div
              aria-label="Content view"
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
                    {option === "list" ? "List" : "Grid"}
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
      </div>
    </PageContainer>
  );
}
