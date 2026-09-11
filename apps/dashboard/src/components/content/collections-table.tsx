"use client";

import type { PostCollectionSummary } from "@notra/schemas/dashboard/content";
import { LogoStack } from "@notra/ui/components/geo/logo-stack";
import { TablePagination } from "@notra/ui/components/shared/table-pagination";
import { Badge } from "@notra/ui/components/ui/badge";

import { StatusSpinner } from "@/components/geo/status-spinner";
import { Table, type TableColumn } from "@/components/motion/table";
import {
  COLLECTION_TABLE_ROW_HEIGHT,
  COLLECTION_TYPE_STACK_LIMIT,
} from "@/constants/content-collections";
import type {
  CollectionStatus,
  CollectionsTableProps,
} from "@/types/content/collection";
import {
  collectionMeta,
  collectionStatus,
  collectionStatusLabel,
} from "@/utils/content-collections";
import { formatRelativeDate } from "@/utils/content-preview";
import {
  getOutputTypeIconClass,
  getOutputTypeLabel,
  OutputTypeIcon,
} from "@/utils/output-types";
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
  return (
    <Badge
      className="inline-flex items-center gap-1.5 rounded-sm text-[0.6875rem] whitespace-nowrap"
      variant={statusVariant(status)}
    >
      {status === "generating" ? <StatusSpinner /> : null}
      {collectionStatusLabel(status)}
    </Badge>
  );
}

function CollectionTypesCell({ contentTypes }: { contentTypes: string[] }) {
  return (
    <LogoStack
      items={contentTypes.map((type) => ({
        key: type,
        label: getOutputTypeLabel(type),
        renderIcon: (className) => (
          <OutputTypeIcon
            className={`${className} ${getOutputTypeIconClass(type)}`}
            outputType={type}
          />
        ),
      }))}
      limit={COLLECTION_TYPE_STACK_LIMIT}
    />
  );
}

function CollectionNameCell({
  collection,
}: {
  collection: PostCollectionSummary;
}) {
  return (
    <span className="flex min-w-0 flex-col gap-0.5">
      <span className="truncate text-sm leading-snug font-medium">
        {collection.name}
      </span>
      <span className="text-muted-foreground truncate text-xs tabular-nums">
        {collectionMeta(collection)}
      </span>
    </span>
  );
}

const COLLECTION_COLUMNS: TableColumn<PostCollectionSummary>[] = [
  {
    key: "name",
    header: "Name",
    width: "1fr",
    minWidth: "16rem",
    cell: (collection) => <CollectionNameCell collection={collection} />,
  },
  {
    key: "types",
    header: "Types",
    width: "9rem",
    cell: (collection) => (
      <CollectionTypesCell contentTypes={collection.contentTypes} />
    ),
  },
  {
    key: "status",
    header: "Status",
    width: "8rem",
    cell: (collection) => (
      <CollectionStatusBadge status={collectionStatus(collection)} />
    ),
  },
  {
    key: "createdAt",
    header: "Created",
    width: "8.5rem",
    cell: (collection) => (
      <span className="text-muted-foreground whitespace-nowrap tabular-nums">
        {formatRelativeDate(collection.createdAt)}
      </span>
    ),
  },
];

export function CollectionsTable({
  collections,
  pagination,
  onOpen,
  onHover,
}: CollectionsTableProps) {
  return (
    <Table
      className="rounded-2xl"
      columns={COLLECTION_COLUMNS}
      data={collections}
      emptyState="No content on this page"
      footer={<TablePagination {...pagination} itemLabel="collections" />}
      getRowId={(collection) => collection.id}
      height={paginatedTableHeightFor(
        pagination.pageRowCount,
        COLLECTION_TABLE_ROW_HEIGHT
      )}
      onRowClick={(collection) => onOpen(collection.id)}
      onRowPointerEnter={(collection) => onHover?.(collection.id)}
      rowHeight={COLLECTION_TABLE_ROW_HEIGHT}
    />
  );
}
