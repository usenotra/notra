"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MeasuringStrategy,
  MouseSensor,
  pointerWithin,
  rectIntersection,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useVirtualizer } from "@tanstack/react-virtual";
import { memo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/button";
import { ShelfMemberAvatar } from "@/components/geo/shelf/shelf-member-avatar";
import { ShelfPlacementBadge } from "@/components/geo/shelf/shelf-placement-badge";
import { ShelfTicketBadge } from "@/components/geo/shelf/shelf-ticket-badge";
import {
  GEO_SHELF_BOARD_CARD_HEIGHT,
  GEO_SHELF_BOARD_COLUMN_HEADER_HEIGHT,
  GEO_SHELF_BOARD_COLUMN_SCROLL_HEIGHT,
  GEO_SHELF_BOARD_COLUMN_WIDTH,
  GEO_SHELF_BOARD_HEIGHT,
  GEO_SHELF_BOARD_OVERSCAN,
  GEO_SHELF_NO_MATCHES_MESSAGE,
} from "@/constants/geo-shelf";
import { cn } from "@/lib/utils";
import type {
  GeoShelfBoardColumnId,
  GeoShelfBoardItems,
  GeoShelfBoardProps,
  GeoShelfRow,
} from "@/types/geo-shelf";
import {
  applyShelfBoardOrder,
  boardColumnForRow,
  boardColumnsForTicketFilter,
  findShelfBoardContainer,
  groupRowsByBoardColumn,
  isShelfBoardColumnId,
  moveShelfBoardItem,
} from "@/utils/geo-shelf";

const POINTER_ACTIVATION_DISTANCE = 8;
const TOUCH_ACTIVATION_DELAY_MS = 150;
const TOUCH_ACTIVATION_TOLERANCE = 8;
const UNTRACKED_COLUMN = "untracked" as const;
const EMPTY_COLUMN_IDS: UniqueIdentifier[] = [];
const skipSortableLayout = () => false;
const CARD_MIN_HEIGHT = GEO_SHELF_BOARD_CARD_HEIGHT - 8;

const BOARD_SENSORS = {
  mouse: { activationConstraint: { distance: POINTER_ACTIVATION_DISTANCE } },
  touch: {
    activationConstraint: {
      delay: TOUCH_ACTIVATION_DELAY_MS,
      tolerance: TOUCH_ACTIVATION_TOLERANCE,
    },
  },
} as const;

const BOARD_MEASURING = {
  droppable: { strategy: MeasuringStrategy.WhileDragging },
} as const;

function rowsForColumn(
  ids: string[],
  rowById: Map<string, GeoShelfRow>
): GeoShelfRow[] {
  const rows: GeoShelfRow[] = [];
  for (const id of ids) {
    const row = rowById.get(id);
    if (row) {
      rows.push(row);
    }
  }
  return rows;
}

function ShelfBoardCardSkeleton() {
  return (
    <div aria-hidden className="space-y-2">
      <div className="space-y-1.5">
        <div className="bg-muted h-4 w-3/4 rounded" />
        <div className="bg-muted h-3 w-1/3 rounded" />
      </div>
      <div className="flex gap-1.5">
        <div className="bg-muted h-5 w-14 rounded-full" />
        <div className="bg-muted h-5 w-16 rounded-full" />
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="bg-muted h-4 w-20 rounded-full" />
        <div className="bg-muted h-3 w-12 rounded" />
      </div>
    </div>
  );
}

function ShelfBoardCard({
  row,
  disabled,
  isPlaceholder,
  onActivate,
}: {
  row: GeoShelfRow;
  disabled: boolean;
  isPlaceholder: boolean;
  onActivate: (row: GeoShelfRow) => void;
}) {
  "use no memo";
  const { attributes, listeners, setNodeRef } = useSortable({
    id: row.id,
    animateLayoutChanges: skipSortableLayout,
    disabled: { draggable: disabled },
    data: { type: "card" },
  });
  const title = row.title ?? row.domain;

  return (
    <button
      {...attributes}
      {...listeners}
      aria-label={title}
      className={cn(
        "w-full rounded-lg border p-3 text-left outline-none",
        isPlaceholder
          ? "border-foreground/15 bg-muted/40 cursor-grabbing border-dashed shadow-none"
          : "bg-background shadow-sm",
        disabled
          ? "cursor-default opacity-60"
          : !isPlaceholder && "cursor-grab active:cursor-grabbing",
        !isPlaceholder && "focus-visible:ring-ring focus-visible:ring-2"
      )}
      onClick={() => {
        if (!isPlaceholder) {
          onActivate(row);
        }
      }}
      ref={setNodeRef}
      style={{ minHeight: CARD_MIN_HEIGHT }}
      type="button"
    >
      {isPlaceholder ? (
        <ShelfBoardCardSkeleton />
      ) : (
        <ShelfBoardCardBody row={row} />
      )}
    </button>
  );
}

function ShelfBoardCardBody({ row }: { row: GeoShelfRow }) {
  const title = row.title ?? row.domain;
  return (
    <div className="space-y-2">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{title}</p>
        <p className="text-muted-foreground truncate text-xs">{row.domain}</p>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {row.opportunity ? (
          <ShelfTicketBadge status={row.opportunity.status} />
        ) : (
          <span className="text-muted-foreground text-xs">No ticket</span>
        )}
        <ShelfPlacementBadge
          evidence={row.ownPlacement?.evidence}
          status={row.ownPlacement?.status ?? null}
          tooltip={false}
        />
      </div>
      <div className="text-muted-foreground flex items-center justify-between gap-2 text-xs">
        <ShelfMemberAvatar
          className="min-w-0 gap-1.5"
          member={row.assignee}
          size="sm"
        />
        <span className="shrink-0 tabular-nums">
          {row.citations.windowCount} cited
        </span>
      </div>
    </div>
  );
}

const ShelfBoardColumn = memo(function ShelfBoardColumn({
  columnId,
  name,
  rows,
  count,
  pendingSourceIds,
  activeId,
  onRowClick,
  onLoadMore,
}: {
  columnId: GeoShelfBoardColumnId;
  name: string;
  rows: GeoShelfRow[];
  count: number;
  pendingSourceIds: ReadonlySet<string>;
  activeId: string | null;
  onRowClick: (row: GeoShelfRow) => void;
  /** Set while the server has more cards for this column than are loaded. */
  onLoadMore: (() => void) | undefined;
}) {
  "use no memo";
  const scrollRef = useRef<HTMLDivElement>(null);
  const dropDisabled = columnId === UNTRACKED_COLUMN;
  const { isOver, setNodeRef } = useDroppable({
    id: columnId,
    data: { type: "column" },
    disabled: dropDisabled,
  });
  const itemIds =
    rows.length > 0 ? rows.map((row) => row.id) : EMPTY_COLUMN_IDS;
  // react-doctor-disable-next-line react-hooks-js/incompatible-library
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => GEO_SHELF_BOARD_CARD_HEIGHT,
    getItemKey: (index) => rows[index]?.id ?? index,
    initialRect: {
      height: GEO_SHELF_BOARD_COLUMN_SCROLL_HEIGHT,
      width: GEO_SHELF_BOARD_COLUMN_WIDTH,
    },
    overscan: GEO_SHELF_BOARD_OVERSCAN,
  });
  const virtualItems = virtualizer.getVirtualItems();

  // Pages are shared by every column, so only the column being read asks for
  // more; a sparse column never pages through the shelf on its own.
  const handleScroll = () => {
    const element = scrollRef.current;
    if (!(element && onLoadMore)) {
      return;
    }
    const distanceToEnd =
      element.scrollHeight - element.scrollTop - element.clientHeight;
    if (distanceToEnd < GEO_SHELF_BOARD_CARD_HEIGHT * 2) {
      onLoadMore();
    }
  };

  return (
    <section
      className={cn(
        // min-h-0 keeps the column inside the board; otherwise it grows with
        // every card and the virtualizer mounts the full list.
        "bg-secondary flex h-full min-h-0 shrink-0 flex-col overflow-hidden rounded-md border",
        "transition-[border-color,background-color] duration-150 ease-out",
        isOver && !dropDisabled && "border-foreground/15 bg-background/40",
        isOver && dropDisabled && "bg-muted/50"
      )}
      ref={setNodeRef}
      style={{ width: GEO_SHELF_BOARD_COLUMN_WIDTH }}
    >
      <header
        className="flex shrink-0 items-center justify-between px-3 text-sm font-semibold"
        style={{ height: GEO_SHELF_BOARD_COLUMN_HEADER_HEIGHT }}
      >
        <h2 className="text-sm font-semibold">{name}</h2>
        <span className="text-muted-foreground tabular-nums">{count}</span>
      </header>
      <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
        <div
          className="min-h-0 flex-1 overflow-y-auto p-2"
          onScroll={handleScroll}
          ref={scrollRef}
        >
          {rows.length === 0 && !onLoadMore ? (
            <p className="text-muted-foreground px-1 py-6 text-center text-xs">
              Empty
            </p>
          ) : null}
          {rows.length === 0 ? null : (
            <div
              className="relative w-full"
              style={{ height: virtualizer.getTotalSize() }}
            >
              {virtualItems.map((item) => {
                const row = rows[item.index];
                if (!row) {
                  return null;
                }
                return (
                  <div
                    className="absolute top-0 right-0 left-0 pb-2"
                    data-index={item.index}
                    key={item.key}
                    ref={virtualizer.measureElement}
                    style={{ transform: `translateY(${item.start}px)` }}
                  >
                    <ShelfBoardCard
                      disabled={pendingSourceIds.has(row.id)}
                      isPlaceholder={row.id === activeId}
                      onActivate={onRowClick}
                      row={row}
                    />
                  </div>
                );
              })}
            </div>
          )}
          {onLoadMore ? (
            <Button
              className="mt-1 w-full"
              onClick={onLoadMore}
              size="sm"
              type="button"
              variant="ghost"
            >
              Load more
            </Button>
          ) : null}
        </div>
      </SortableContext>
    </section>
  );
});

export function ShelfBoard({
  rows,
  boardCounts,
  hasNextPage,
  isFetching,
  onLoadMore,
  ticketFilter,
  currentMemberId,
  pendingSourceIds,
  onRowClick,
  onUpdateOpportunity,
}: GeoShelfBoardProps) {
  const grouped = groupRowsByBoardColumn(rows);
  const rowById = new Map(rows.map((row) => [row.id, row]));
  const visibleColumns = boardColumnsForTicketFilter(ticketFilter);
  const visibleColumnIds = new Set(
    visibleColumns.map((column) => column.id as GeoShelfBoardColumnId)
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draftItems, setDraftItems] = useState<GeoShelfBoardItems | null>(null);
  const [committedOrder, setCommittedOrder] =
    useState<GeoShelfBoardItems | null>(null);
  const lastOverId = useRef<UniqueIdentifier | null>(null);
  const recentlyMovedToNewContainer = useRef(false);
  const items = draftItems ?? applyShelfBoardOrder(grouped, committedOrder);
  const sensors = useSensors(
    useSensor(MouseSensor, BOARD_SENSORS.mouse),
    useSensor(TouchSensor, BOARD_SENSORS.touch),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  const activeRow = activeId ? (rowById.get(activeId) ?? null) : null;

  if (rows.length === 0) {
    return (
      <div className="text-muted-foreground flex min-h-48 items-center justify-center rounded-xl border border-dashed px-4 text-sm">
        {GEO_SHELF_NO_MATCHES_MESSAGE}
      </div>
    );
  }

  const collisionDetection: CollisionDetection = (args) => {
    const pointerHits = pointerWithin(args);
    const cardHit = pointerHits.find((collision) => {
      const id = String(collision.id);
      return id !== activeId && !isShelfBoardColumnId(id);
    });
    if (cardHit) {
      lastOverId.current = cardHit.id;
      return [cardHit];
    }

    if (activeId && pointerHits.some((hit) => String(hit.id) === activeId)) {
      lastOverId.current = activeId;
      return [{ id: activeId }];
    }

    const columnHit = pointerHits.find((collision) =>
      isShelfBoardColumnId(String(collision.id))
    );
    if (columnHit) {
      lastOverId.current = columnHit.id;
      return [columnHit];
    }

    const intersecting = rectIntersection(args);
    const fallback =
      intersecting.find((collision) => {
        const id = String(collision.id);
        return id !== activeId && !isShelfBoardColumnId(id);
      }) ??
      intersecting.find((collision) =>
        isShelfBoardColumnId(String(collision.id))
      );

    if (fallback) {
      lastOverId.current = fallback.id;
      return [fallback];
    }

    if (recentlyMovedToNewContainer.current) {
      lastOverId.current = activeId;
    }

    return lastOverId.current ? [{ id: lastOverId.current }] : [];
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
    setDraftItems(items);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const over = event.over;
    const draggedId = String(event.active.id);
    if (!over || String(over.id) === draggedId) {
      return;
    }

    const activeContainer = findShelfBoardContainer(draggedId, items);
    const overContainer = findShelfBoardContainer(String(over.id), items);
    if (
      !activeContainer ||
      !overContainer ||
      !visibleColumnIds.has(overContainer) ||
      (overContainer === UNTRACKED_COLUMN &&
        activeContainer !== UNTRACKED_COLUMN)
    ) {
      return;
    }

    const translated = event.active.rect.current.translated;
    const pointerBelowOverItem = Boolean(
      translated && translated.top > over.rect.top + over.rect.height
    );
    const next = moveShelfBoardItem(
      items,
      draggedId,
      String(over.id),
      pointerBelowOverItem
    );
    if (!next) {
      return;
    }
    if (activeContainer !== overContainer) {
      recentlyMovedToNewContainer.current = true;
      requestAnimationFrame(() => {
        recentlyMovedToNewContainer.current = false;
      });
    }
    setDraftItems(next);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const draggedId = String(event.active.id);
    const overId = event.over?.id;
    const row = rowById.get(draggedId);
    const target = overId
      ? findShelfBoardContainer(String(overId), items)
      : null;
    const sourceColumn = row ? boardColumnForRow(row) : null;
    const rejected =
      !target ||
      !visibleColumnIds.has(target) ||
      (target === UNTRACKED_COLUMN && sourceColumn !== UNTRACKED_COLUMN);

    setActiveId(null);
    lastOverId.current = null;

    if (rejected || !draftItems) {
      setDraftItems(null);
      return;
    }

    setCommittedOrder(draftItems);
    setDraftItems(null);

    if (!row || target === UNTRACKED_COLUMN) {
      return;
    }
    if (row.opportunity?.status === target) {
      return;
    }
    onUpdateOpportunity(row.id, {
      status: target,
      ...(row.opportunity ? {} : { assigneeMemberId: currentMemberId }),
    });
  };

  const handleDragCancel = () => {
    setActiveId(null);
    setDraftItems(null);
    lastOverId.current = null;
  };

  return (
    <DndContext
      collisionDetection={collisionDetection}
      measuring={BOARD_MEASURING}
      onDragCancel={handleDragCancel}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragStart={handleDragStart}
      sensors={sensors}
    >
      <div
        className="flex gap-3 overflow-x-auto overflow-y-hidden"
        style={{ height: GEO_SHELF_BOARD_HEIGHT }}
      >
        {visibleColumns.map((column) => {
          const columnId = column.id as GeoShelfBoardColumnId;
          const columnRows = rowsForColumn(items[columnId], rowById);
          const serverCount = boardCounts[columnId];
          const hasMore =
            hasNextPage && !isFetching && columnRows.length < serverCount;
          return (
            <ShelfBoardColumn
              activeId={activeId}
              columnId={columnId}
              count={
                hasNextPage
                  ? Math.max(serverCount, columnRows.length)
                  : columnRows.length
              }
              key={columnId}
              name={column.name}
              onLoadMore={hasMore ? onLoadMore : undefined}
              onRowClick={onRowClick}
              pendingSourceIds={pendingSourceIds}
              rows={columnRows}
            />
          );
        })}
      </div>
      {typeof window === "undefined"
        ? null
        : createPortal(
            <DragOverlay dropAnimation={null}>
              {activeRow ? (
                <div
                  className="bg-background ring-foreground/10 cursor-grabbing rounded-lg border p-3 shadow-lg ring-1"
                  style={{
                    minHeight: CARD_MIN_HEIGHT,
                    width: GEO_SHELF_BOARD_COLUMN_WIDTH - 16,
                  }}
                >
                  <ShelfBoardCardBody row={activeRow} />
                </div>
              ) : null}
            </DragOverlay>,
            document.body
          )}
    </DndContext>
  );
}
