"use client";

import type { PostCollectionSummary } from "@notra/schemas/dashboard/content";
import { LogoStack } from "@notra/ui/components/geo/logo-stack";
import { TablePagination } from "@notra/ui/components/shared/table-pagination";
import { Badge } from "@notra/ui/components/ui/badge";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { StatusSpinner } from "@/components/geo/status-spinner";
import { Table, type TableColumn } from "@/components/motion/table";
import {
  COLLECTION_TABLE_ROW_HEIGHT,
  COLLECTION_TYPE_STACK_LIMIT,
} from "@/constants/content-collections";
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
  const singleType = contentTypes.length === 1 ? contentTypes[0] : null;
  if (singleType) {
    return (
      <span className="text-muted-foreground inline-flex items-center gap-2 text-xs">
        <OutputTypeIcon
          className={`size-4 shrink-0 ${getOutputTypeIconClass(singleType)}`}
          outputType={singleType}
        />
        {getOutputTypeLabel(singleType)}
      </span>
    );
  }
  return (
    <span className="text-muted-foreground inline-flex items-center gap-2 text-xs">
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
      {contentTypes.length > 1 ? (
        <span>{contentTypes.length} formats</span>
      ) : null}
    </span>
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
        {collectionTitle(collection)}
      </span>
      <span className="text-muted-foreground truncate text-xs tabular-nums">
        {collectionMeta(collection)}
      </span>
    </span>
  );
}

const COLLECTION_COLUMNS: TableColumn<PostCollectionSummary>[] = [
  {
    key: "types",
    header: "Format",
    width: "10rem",
    collapsePriority: 2,
    cell: (collection) => (
      <CollectionTypesCell contentTypes={collection.contentTypes} />
    ),
  },
  {
    key: "status",
    header: "Status",
    width: "8rem",
    collapsePriority: 1,
    cell: (collection) => (
      <CollectionStatusBadge status={collectionStatus(collection)} />
    ),
  },
  {
    key: "createdAt",
    header: "Created",
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

export function CollectionsView({
  collections,
  pagination,
  organizationSlug,
  view,
  loading = false,
}: CollectionsViewProps) {
  const router = useRouter();
  const columns: TableColumn<PostCollectionSummary>[] = [
    {
      key: "name",
      header: "Content",
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
    ...COLLECTION_COLUMNS,
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
            <Link
              className="border-border/60 bg-background hover:bg-muted/40 focus-visible:ring-ring flex min-w-0 flex-col gap-4 rounded-xl border p-4 transition-colors focus-visible:ring-2 focus-visible:outline-none"
              href={collectionHref(organizationSlug, collection)}
              key={collection.id}
              prefetch={false}
              title={collectionTitle(collection)}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CollectionTypesCell contentTypes={collection.contentTypes} />
                <CollectionStatusBadge status={collectionStatus(collection)} />
              </div>
              <div className="min-w-0 flex-1 space-y-1.5">
                <p className="line-clamp-2 text-sm leading-snug font-medium">
                  {collectionTitle(collection)}
                </p>
                <p className="text-muted-foreground text-xs">
                  {collectionMeta(collection)}
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
          ))}
        </div>
        {collections.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center text-sm">
            No content on this page
          </p>
        ) : null}
        <TablePagination {...pagination} itemLabel="items" />
      </div>
    );
  }

  return (
    <Table
      className="rounded-xl"
      columns={columns}
      data={collections}
      emptyState="No content on this page"
      footer={<TablePagination {...pagination} itemLabel="items" />}
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
    />
  );
}
