"use client";

import {
  ArrowUp01Icon,
  InformationCircleIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ReactElement } from "react";

import { useUiLabels } from "@notra/ui/components/shared/ui-labels-provider";
import { Checkbox } from "@notra/ui/components/ui/checkbox";
import {
  TableHead,
  TableHeader,
  TableRow,
} from "@notra/ui/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import { alignFlex, alignText, headerMinWidth } from "@notra/ui/lib/data-table";
import { cn } from "@notra/ui/lib/utils";
import type {
  DataTableHeaderProps,
  TableColumn,
} from "@notra/ui/types/data-table";

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

export function DataTableHeader<T>({
  columns,
  rowHeight,
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
  minColumnWidth,
}: DataTableHeaderProps<T>) {
  const labels = useUiLabels();
  return (
    <TableHeader>
      <TableRow style={{ height: rowHeight }}>
        {selectable ? (
          <TableHead className="h-auto p-0">
            <div className="flex items-center justify-center">
              <Checkbox
                aria-label={labels.selectAllRows}
                checked={allSelected}
                indeterminate={!allSelected && someSelected}
                onCheckedChange={onToggleAll}
              />
            </div>
          </TableHead>
        ) : null}
        {columns.map((column) => {
          const active = sort?.key === column.key;
          let ariaSort: "ascending" | "descending" | undefined;
          if (active) {
            ariaSort = sort?.direction === "asc" ? "ascending" : "descending";
          }
          return (
            <TableHead
              aria-sort={ariaSort}
              className="group relative h-auto p-0"
              key={column.key}
              ref={(el) => {
                thRefs.current[column.key] = el;
              }}
              style={{ minWidth: headerMinWidth(column, minColumnWidth) }}
            >
              <div
                className={cn("flex items-center", alignFlex(column.align))}
                style={{ height: rowHeight }}
              >
                {column.sortable ? (
                  <WithHeaderHint column={column}>
                    <button
                      className={cn(
                        "hover:text-foreground focus-visible:ring-ring/50 flex h-full flex-1 items-center gap-1 rounded-md px-4 transition-colors outline-none select-none focus-visible:ring-[3px]",
                        alignFlex(column.align),
                        active && "text-foreground"
                      )}
                      onClick={() => onToggleSort(column.key)}
                      type="button"
                    >
                      {column.align === "right" ? null : (
                        <HeaderLabel column={column} />
                      )}
                      <span
                        aria-hidden
                        className={cn(
                          "inline-flex shrink-0 transition-[rotate,opacity] duration-fast ease-out motion-reduce:transition-none",
                          active ? "opacity-100" : "opacity-35",
                          active && sort?.direction === "desc" && "rotate-180"
                        )}
                      >
                        <HugeiconsIcon icon={ArrowUp01Icon} size={14} />
                      </span>
                      {column.align === "right" ? (
                        <HeaderLabel column={column} />
                      ) : null}
                    </button>
                  </WithHeaderHint>
                ) : (
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
                )}
              </div>
              {resizable ? (
                <button
                  aria-label={labels.resizeColumn(
                    typeof column.header === "string"
                      ? column.header
                      : column.key
                  )}
                  className="hover:bg-primary/40 absolute top-0 right-0 h-full w-1.5 cursor-col-resize touch-none bg-transparent transition-colors"
                  onPointerDown={(e) => onResizeStart(column.key, e)}
                  onPointerMove={onResizeMove}
                  onPointerUp={onResizeEnd}
                  tabIndex={-1}
                  type="button"
                />
              ) : null}
            </TableHead>
          );
        })}
        <TableHead aria-hidden className="h-auto p-0" />
      </TableRow>
    </TableHeader>
  );
}
