"use client";

import { useRouter } from "next/navigation";
import { parseAsInteger, useQueryState } from "nuqs";
import { useMemo, useState } from "react";

import { CollectionsTable } from "@/components/content/collections-table";
import { CreateContentButton } from "@/components/content/create-content-button";
import { CreateContentDialog } from "@/components/content/create-content-dialog";
import { EmptyState } from "@/components/empty-state";
import { EmptyStateTablePreview } from "@/components/empty-state-preview";
import { PageContainer } from "@/components/layout/container";
import { useOrganizationsContext } from "@/components/providers/organization-provider";
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
  const router = useRouter();

  const [rawPage, setPage] = useQueryState(
    "page",
    parseAsInteger.withDefault(1).withOptions({ clearOnDefault: true })
  );
  const page = Math.max(1, rawPage);

  const { data, isPending } = useCollections(organizationId, page);

  const collections = useMemo(
    () => data?.collections ?? [],
    [data?.collections]
  );
  const [createOpen, setCreateOpen] = useState(false);

  const pageCount = data?.pagination.totalPages ?? 1;
  const pagination: TablePaginationState = {
    page,
    pageCount,
    pageSize: data?.pagination.pageSize ?? collections.length,
    totalItems: data?.pagination.totalCount ?? collections.length,
    pageRowCount: collections.length,
    setPage: (next) => setPage(Math.min(Math.max(1, next), pageCount)),
  };

  const collectionPath = (collectionId: string) =>
    `/${organizationSlug}/collection/${collectionId}`;

  const isEmpty = !isPending && collections.length === 0 && page === 1;

  return (
    <PageContainer className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="w-full space-y-6 px-4 lg:px-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">Content</h1>
            <p className="text-muted-foreground max-w-2xl text-sm text-pretty">
              Every batch of generated content, organized into collections.
            </p>
          </div>
          <CreateContentButton
            disabled={!organizationId}
            onClick={() => setCreateOpen(true)}
          />
        </header>

        {isPending ? <CollectionsPageSkeleton /> : null}

        {isEmpty ? (
          <EmptyState
            action={
              <CreateContentButton
                disabled={!organizationId}
                onClick={() => setCreateOpen(true)}
              />
            }
            description="Generate your first piece of content to get started."
            preview={
              <EmptyStateTablePreview
                columns={EMPTY_STATE_TABLE_COLUMNS.content}
                rows={EMPTY_STATE_TABLE_ROWS}
              />
            }
            title="No content yet"
          />
        ) : null}

        {!(isPending || isEmpty) ? (
          <CollectionsTable
            collections={collections}
            onHover={(collectionId) =>
              router.prefetch(collectionPath(collectionId))
            }
            onOpen={(collectionId) => router.push(collectionPath(collectionId))}
            pagination={pagination}
          />
        ) : null}
      </div>
      <CreateContentDialog
        entry="content_list"
        hideTrigger
        onOpenChange={setCreateOpen}
        open={createOpen}
        organizationId={organizationId}
      />
    </PageContainer>
  );
}
