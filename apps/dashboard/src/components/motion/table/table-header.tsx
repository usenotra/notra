"use client";

import {
  ArrowLeftToLineIcon,
  ArrowRightToLineIcon,
  ArrowUp01Icon,
  Delete02Icon,
  DragDropVerticalIcon,
  InformationCircleIcon,
  MoreHorizontalIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import { motion } from "motion/react";
import {
  type PointerEvent as ReactPointerEvent,
  type ReactElement,
  useEffect,
} from "react";
import { createPortal } from "react-dom";

import { Checkbox } from "@/components/motion/checkbox";
import { EASE_OUT, SPRING_PRESS } from "@/lib/ease";
import { cn } from "@/lib/utils";

import { TableMenu } from "./table-menu";
import type {
  HeaderCellRefs,
  InsertPosition,
  SortState,
  TableColumn,
} from "./types";
import {
  alignFlex,
  alignText,
  COLUMN_ACTIVE_SHADOW,
  headerMinWidth,
  REORDER_HANDLE_PX,
} from "./utils";

export interface TableHeaderProps<T> {
  columns: TableColumn<T>[];
  rowHeight: number;
  reduce: boolean;
  thRefs: HeaderCellRefs;
  selectable: boolean;
  allSelected: boolean;
  someSelected: boolean;
  onToggleAll: () => void;
  sort: SortState | null;
  onToggleSort: (key: string) => void;
  resizable: boolean;
  minColumnWidth: number;
  onResizeStart: (key: string, e: ReactPointerEvent) => void;
  onResizeMove: (e: ReactPointerEvent) => void;
  onResizeEnd: (e: ReactPointerEvent) => void;
  reorderable: boolean;
  dragKey: string | null;
  dropIndex: number | null;
  onReorderStart: (key: string, e: ReactPointerEvent) => void;
  onReorderMove: (e: ReactPointerEvent) => void;
  onReorderEnd: (e: ReactPointerEvent) => void;
  onInsertColumn?: (index: number, position: InsertPosition) => void;
  onDeleteColumn?: (columnKey: string, index: number) => void;
  onColumnRename?: (columnKey: string, value: string) => void;
  activeColumn: string | null;
  onColumnActivate?: (key: string) => void;
  onColumnDeactivate?: () => void;
}

/** Column insert / delete menu items shared by the header cell and the portal handle. */
function columnMenuItems<T>(
  column: TableColumn<T>,
  index: number,
  onInsertColumn?: (index: number, position: InsertPosition) => void,
  onDeleteColumn?: (columnKey: string, index: number) => void
) {
  return [
    ...(onInsertColumn
      ? [
          {
            label: "Insert before",
            icon: <HugeiconsIcon icon={ArrowLeftToLineIcon} size={16} />,
            onSelect: () => onInsertColumn(index, "before"),
          },
          {
            label: "Insert after",
            icon: <HugeiconsIcon icon={ArrowRightToLineIcon} size={16} />,
            onSelect: () => onInsertColumn(index, "after"),
          },
        ]
      : []),
    ...(onDeleteColumn
      ? [
          {
            label: "Delete column",
            icon: <HugeiconsIcon icon={Delete02Icon} size={16} />,
            destructive: true,
            onSelect: () => onDeleteColumn(column.key, index),
          },
        ]
      : []),
  ];
}

/** The ellipse handle, portaled so it can sit on the column's top border without
 * the scroll container clipping it. Straddles the border to bridge hover. */
function ColumnHandle<T>({
  column,
  index,
  thRefs,
  onInsertColumn,
  onDeleteColumn,
  onEnter,
  onLeave,
}: {
  column: TableColumn<T>;
  index: number;
  thRefs: HeaderCellRefs;
  onInsertColumn?: (index: number, position: InsertPosition) => void;
  onDeleteColumn?: (columnKey: string, index: number) => void;
  onEnter: () => void;
  onLeave: () => void;
}) {
  useEffect(() => {
    window.addEventListener("scroll", onLeave, true);
    return () => window.removeEventListener("scroll", onLeave, true);
  }, [onLeave]);

  const el = thRefs.current[column.key];
  if (!el || typeof document === "undefined") {
    return null;
  }
  const rect = el.getBoundingClientRect();

  return createPortal(
    <div
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}
      style={{
        position: "fixed",
        top: rect.top,
        left: rect.left + rect.width / 2,
        transform: "translate(-50%, -50%)",
        zIndex: 40,
      }}
    >
      <TableMenu
        ariaLabel={`${column.key} column options`}
        items={columnMenuItems(column, index, onInsertColumn, onDeleteColumn)}
        trigger={<HugeiconsIcon icon={MoreHorizontalIcon} size={12} />}
        triggerClassName="flex h-2 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
      />
    </div>,
    document.body
  );
}

const HINT_ICON_PX_SIZE = 13;

/** Header text plus its info icon. The icon is decoration: the element around
 * it is the tooltip trigger, so a sortable header stays a single button. */
function HeaderLabel<T>({ column }: { column: TableColumn<T> }) {
  if (!column.hint) {
    return <span className="whitespace-nowrap">{column.header}</span>;
  }
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap">
      {column.header}
      <HugeiconsIcon
        aria-hidden
        className="shrink-0 opacity-60"
        icon={InformationCircleIcon}
        size={HINT_ICON_PX_SIZE}
      />
    </span>
  );
}

/** Wraps the header's own button/span as the tooltip trigger, so the hint
 * never adds a nested button or a second tab stop. */
function WithHeaderHint<T>({
  column,
  children,
}: {
  column: TableColumn<T>;
  children: ReactElement;
}) {
  if (!column.hint) {
    return children;
  }
  return (
    <Tooltip>
      <TooltipTrigger render={children} />
      <TooltipContent side="top">
        <div className="max-w-64 text-xs">{column.hint}</div>
      </TooltipContent>
    </Tooltip>
  );
}

export function TableHeader<T>({
  columns,
  rowHeight,
  reduce,
  thRefs,
  selectable,
  allSelected,
  someSelected,
  onToggleAll,
  sort,
  onToggleSort,
  resizable,
  onResizeStart,
  onResizeMove,
  onResizeEnd,
  reorderable,
  minColumnWidth,
  dragKey,
  dropIndex,
  onReorderStart,
  onReorderMove,
  onReorderEnd,
  onInsertColumn,
  onDeleteColumn,
  onColumnRename,
  activeColumn,
  onColumnActivate,
  onColumnDeactivate,
}: TableHeaderProps<T>) {
  const hasColumnMenu = !!(onInsertColumn || onDeleteColumn);
  const activeIndex = columns.findIndex((c) => c.key === activeColumn);
  const activeColumnDef = activeIndex >= 0 ? columns[activeIndex] : undefined;
  return (
    <>
      {hasColumnMenu && activeColumn && activeColumnDef ? (
        <ColumnHandle
          column={activeColumnDef}
          index={activeIndex}
          onDeleteColumn={onDeleteColumn}
          onEnter={() => onColumnActivate?.(activeColumn)}
          onInsertColumn={onInsertColumn}
          onLeave={() => onColumnDeactivate?.()}
          thRefs={thRefs}
        />
      ) : null}
      <thead>
        <tr style={{ height: rowHeight }}>
          {selectable ? (
            <th className="bg-muted">
              <div className="flex items-center justify-center">
                <Checkbox
                  aria-label="Select all rows"
                  checked={allSelected}
                  className="size-6"
                  indeterminate={!allSelected && someSelected}
                  onCheckedChange={onToggleAll}
                />
              </div>
            </th>
          ) : null}
          {columns.map((column, index) => {
            const active = sort?.key === column.key;
            const isDragging = dragKey === column.key;
            const isActive = activeColumn === column.key;
            let ariaSort: "ascending" | "descending" | undefined;
            if (active) {
              ariaSort = sort?.direction === "asc" ? "ascending" : "descending";
            }
            return (
              <th
                aria-sort={ariaSort}
                className={cn(
                  "group bg-muted text-muted-foreground relative p-0 font-medium",
                  "data-[drop=true]:before:bg-primary data-[drop=true]:before:absolute data-[drop=true]:before:inset-y-0 data-[drop=true]:before:left-0 data-[drop=true]:before:w-0.5",
                  "data-[dropend=true]:after:bg-primary data-[dropend=true]:after:absolute data-[dropend=true]:after:inset-y-0 data-[dropend=true]:after:right-0 data-[dropend=true]:after:w-0.5"
                )}
                data-drop={dragKey ? dropIndex === index : undefined}
                data-dropend={
                  dragKey
                    ? dropIndex === columns.length &&
                      index === columns.length - 1
                    : undefined
                }
                key={column.key}
                onPointerEnter={() => onColumnActivate?.(column.key)}
                onPointerLeave={() => onColumnDeactivate?.()}
                ref={(el) => {
                  thRefs.current[column.key] = el;
                }}
                style={{
                  minWidth: headerMinWidth(
                    column,
                    minColumnWidth,
                    reorderable ? REORDER_HANDLE_PX : 0
                  ),
                  ...(isActive ? { boxShadow: COLUMN_ACTIVE_SHADOW } : {}),
                }}
              >
                <motion.div
                  animate={
                    reduce
                      ? { opacity: isDragging ? 0.5 : 1 }
                      : {
                          scale: isDragging ? 1.04 : 1,
                          opacity: isDragging ? 0.5 : 1,
                        }
                  }
                  className={cn(
                    "flex h-full items-center",
                    alignFlex(column.align)
                  )}
                  style={{ height: rowHeight }}
                  transition={SPRING_PRESS}
                >
                  {reorderable ? (
                    <button
                      aria-label={`Reorder ${column.key} column`}
                      className="text-muted-foreground/60 hover:text-foreground flex h-full w-6 cursor-grab touch-none items-center justify-center transition-colors active:cursor-grabbing"
                      onPointerDown={(e) => onReorderStart(column.key, e)}
                      onPointerMove={onReorderMove}
                      onPointerUp={onReorderEnd}
                      type="button"
                    >
                      <HugeiconsIcon icon={DragDropVerticalIcon} size={14} />
                    </button>
                  ) : null}
                  {column.sortable ? (
                    <WithHeaderHint column={column}>
                      <button
                        className={cn(
                          "hover:text-foreground flex h-full flex-1 items-center gap-1 px-4 transition-colors select-none",
                          alignFlex(column.align),
                          active && "text-foreground"
                        )}
                        onClick={() => onToggleSort(column.key)}
                        type="button"
                      >
                        {column.align === "right" ? null : (
                          <HeaderLabel column={column} />
                        )}
                        <motion.span
                          animate={{
                            rotate:
                              active && sort?.direction === "desc" ? 180 : 0,
                            opacity: active ? 1 : 0.35,
                          }}
                          aria-hidden
                          className="inline-flex shrink-0"
                          transition={
                            reduce
                              ? { duration: 0 }
                              : { duration: 0.18, ease: EASE_OUT }
                          }
                        >
                          <HugeiconsIcon icon={ArrowUp01Icon} size={14} />
                        </motion.span>
                        {column.align === "right" ? (
                          <HeaderLabel column={column} />
                        ) : null}
                      </button>
                    </WithHeaderHint>
                  ) : null}
                  {!column.sortable && onColumnRename ? (
                    <input
                      aria-label={`Rename ${column.key} column`}
                      className={cn(
                        "text-muted-foreground focus:bg-muted focus:text-foreground min-w-0 flex-1 appearance-none truncate rounded-md border-0 bg-transparent px-4 font-medium transition-colors outline-none",
                        alignText(column.align)
                      )}
                      onChange={(e) =>
                        onColumnRename(column.key, e.target.value)
                      }
                      size={1}
                      value={
                        typeof column.header === "string" ? column.header : ""
                      }
                    />
                  ) : null}
                  {!column.sortable && !onColumnRename ? (
                    <WithHeaderHint column={column}>
                      <span
                        className={cn(
                          "flex-1 px-4 whitespace-nowrap",
                          alignText(column.align)
                        )}
                      >
                        <HeaderLabel column={column} />
                      </span>
                    </WithHeaderHint>
                  ) : null}
                </motion.div>
                {resizable ? (
                  <button
                    aria-label={`Resize ${column.key} column`}
                    className="hover:bg-primary/40 absolute top-0 right-0 h-full w-1.5 cursor-col-resize touch-none bg-transparent transition-colors"
                    onPointerDown={(e) => onResizeStart(column.key, e)}
                    onPointerMove={onResizeMove}
                    onPointerUp={onResizeEnd}
                    tabIndex={-1}
                    type="button"
                  />
                ) : null}
              </th>
            );
          })}
          <th aria-hidden className="bg-muted" />
        </tr>
      </thead>
    </>
  );
}
