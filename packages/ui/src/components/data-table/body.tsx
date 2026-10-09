"use client";

import { Fragment } from "react";

import { useUiLabels } from "@notra/ui/components/shared/ui-labels-provider";
import { Checkbox } from "@notra/ui/components/ui/checkbox";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuTrigger,
} from "@notra/ui/components/ui/context-menu";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import {
  TableBody,
  TableCell,
  TableRow,
} from "@notra/ui/components/ui/table";
import {
  TABLE_CELL_INNER_CLASS,
  TABLE_ROW_BORDER_CLASS,
} from "@notra/ui/constants/table";
import { alignText, readCell } from "@notra/ui/lib/data-table";
import { cn } from "@notra/ui/lib/utils";
import type {
  DataTableBodyProps,
  DataTableBodyRowProps,
  TableColumn,
} from "@notra/ui/types/data-table";

const INTERACTIVE_SELECTOR =
  'button, a, input, select, textarea, label, [role="checkbox"], [role="switch"], [role="menuitem"], [role="button"], [contenteditable="true"]';

function isInteractiveTarget(target: EventTarget | null): boolean {
  return (
    target instanceof Element && target.closest(INTERACTIVE_SELECTOR) !== null
  );
}

function SkeletonRows<T>({
  count,
  columns,
  selectable,
  rowHeight,
  keyPrefix,
}: {
  count: number;
  columns: TableColumn<T>[];
  selectable: boolean;
  rowHeight: number;
  keyPrefix: string;
}) {
  return (
    <>
      {Array.from({ length: count }, (_, index) => (
        <TableRow
          className={TABLE_ROW_BORDER_CLASS}
          key={`${keyPrefix}-${String(index)}`}
          style={{ height: rowHeight }}
        >
          {selectable ? <TableCell className="h-auto p-0" /> : null}
          {columns.map((column) => (
            <TableCell
              className={cn("h-auto", alignText(column.align))}
              key={column.key}
            >
              <Skeleton
                className={cn(
                  "h-3 rounded-full",
                  column.align === "right" ? "ml-auto w-10" : "w-2/3"
                )}
              />
            </TableCell>
          ))}
          <TableCell aria-hidden className="h-auto p-0" />
        </TableRow>
      ))}
    </>
  );
}

export function DataTableBodyRow<T>({
  className,
  entry,
  index,
  isLastRow,
  expanded,
  detailId,
  rowHeight,
  rowSizing,
  selectable,
  isSelected,
  columns,
  onRowClick,
  rowKeyboardActivation,
  onRowPointerEnter,
  onToggleRow,
  renderRowContextMenu,
}: DataTableBodyRowProps<T>) {
  const labels = useUiLabels();
  const contentSized = rowSizing === "content";
  // The virtualizer's bottom spacer <tr> can be :last-child, so a CSS
  // last-child rule misses the real final row; flag it explicitly instead.
  const cellBorder = isLastRow ? "border-b-0" : TABLE_ROW_BORDER_CLASS;
  const keyboardActivation = Boolean(onRowClick) && rowKeyboardActivation;
  const tableRow = (
    <TableRow
      className={cn(
        "group hover:bg-muted/50 data-[selected=true]:bg-primary/5 focus-visible:outline-ring focus-visible:outline-2 focus-visible:-outline-offset-2",
        onRowClick && "cursor-pointer",
        className
      )}
      aria-controls={detailId}
      aria-expanded={expanded}
      data-selected={isSelected}
      onClick={
        onRowClick
          ? (event) => {
              if (isInteractiveTarget(event.target)) {
                return;
              }
              onRowClick(entry.row);
            }
          : undefined
      }
      onKeyDown={
        onRowClick && keyboardActivation
          ? (event) => {
              if (event.target !== event.currentTarget) {
                return;
              }
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onRowClick(entry.row);
              }
            }
          : undefined
      }
      onPointerEnter={
        onRowPointerEnter ? () => onRowPointerEnter(entry.row) : undefined
      }
      style={contentSized ? { minHeight: rowHeight } : { height: rowHeight }}
      tabIndex={keyboardActivation ? 0 : undefined}
    >
      {selectable ? (
        <TableCell className={cn("h-auto p-0 text-center", cellBorder)}>
          <div className="flex items-center justify-center">
            <Checkbox
              className="cursor-pointer"
              aria-label={labels.selectRow(String(index + 1))}
              checked={isSelected}
              onCheckedChange={() => onToggleRow(entry.id)}
            />
          </div>
        </TableCell>
      ) : null}
      {columns.map((column) => (
        <TableCell
          className={cn(
            "h-auto max-w-0",
            contentSized ? "overflow-visible align-top" : "overflow-hidden",
            cellBorder,
            alignText(column.align)
          )}
          key={column.key}
        >
          <div
            className={cn(
              TABLE_CELL_INNER_CLASS,
              contentSized && "overflow-visible py-3 whitespace-normal",
              alignText(column.align)
            )}
          >
            {readCell(entry.row, column)}
          </div>
        </TableCell>
      ))}
      <TableCell aria-hidden className={cn("h-auto p-0", cellBorder)} />
    </TableRow>
  );

  if (!renderRowContextMenu) {
    return tableRow;
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger render={tableRow} />
      <ContextMenuContent>{renderRowContextMenu(entry.row)}</ContextMenuContent>
    </ContextMenu>
  );
}

export function DataTableBody<T>({
  columns,
  renderedRows,
  rowCount,
  rowHeight,
  rowSizing,
  bodyHeight,
  loading,
  loadingMore,
  skeletonRows,
  emptyState,
  selectable,
  selected,
  scrolls,
  paddingTop,
  paddingBottom,
  onToggleRow,
  onRowClick,
  rowKeyboardActivation,
  isRowClickable,
  getRowClassName,
  onRowPointerEnter,
  renderRowContextMenu,
  renderRowDetail,
}: DataTableBodyProps<T>) {
  const colSpan = columns.length + (selectable ? 1 : 0) + 1;

  if (rowCount === 0) {
    return (
      <TableBody>
        {loading ? (
          <SkeletonRows
            columns={columns}
            count={Math.max(1, Math.ceil(bodyHeight / rowHeight))}
            keyPrefix="skeleton"
            rowHeight={rowHeight}
            selectable={selectable}
          />
        ) : (
          <TableRow>
            <TableCell className="h-auto p-0" colSpan={colSpan}>
              <div
                className="flex items-center justify-center px-6 text-center whitespace-normal"
                style={{ height: bodyHeight }}
              >
                {typeof emptyState === "string" ? (
                  <span className="text-muted-foreground">{emptyState}</span>
                ) : (
                  emptyState
                )}
              </div>
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    );
  }

  return (
    <TableBody>
      {scrolls && paddingTop > 0 ? (
        <tr aria-hidden style={{ height: paddingTop }}>
          <td colSpan={colSpan} />
        </tr>
      ) : null}
      {renderedRows.map(({ entry, index }) => {
        const detail = renderRowDetail?.(entry.row) ?? null;
        const detailId = detail === null ? undefined : `${entry.id}-detail`;
        const isLastRow = index === rowCount - 1 && !loadingMore;
        return (
          <Fragment key={entry.id}>
            <DataTableBodyRow
              className={getRowClassName?.(entry.row)}
              columns={columns}
              detailId={detailId}
              entry={entry}
              expanded={renderRowDetail ? detail !== null : undefined}
              index={index}
              isLastRow={isLastRow && detail === null}
              isSelected={selected.has(entry.id)}
              onRowClick={
                !isRowClickable || isRowClickable(entry.row)
                  ? onRowClick
                  : undefined
              }
              onRowPointerEnter={onRowPointerEnter}
              onToggleRow={onToggleRow}
              renderRowContextMenu={renderRowContextMenu}
              rowHeight={rowHeight}
              rowKeyboardActivation={rowKeyboardActivation}
              rowSizing={rowSizing}
              selectable={selectable}
            />
            {detail === null ? null : (
              <TableRow className="hover:bg-transparent" id={detailId}>
                <TableCell
                  className={cn(
                    "bg-muted/20 h-auto p-0 whitespace-normal",
                    isLastRow ? "border-b-0" : TABLE_ROW_BORDER_CLASS
                  )}
                  colSpan={colSpan}
                >
                  {detail}
                </TableCell>
              </TableRow>
            )}
          </Fragment>
        );
      })}
      {scrolls && paddingBottom > 0 ? (
        <tr aria-hidden style={{ height: paddingBottom }}>
          <td colSpan={colSpan} />
        </tr>
      ) : null}
      {loadingMore ? (
        <SkeletonRows
          columns={columns}
          count={skeletonRows}
          keyPrefix="more"
          rowHeight={rowHeight}
          selectable={selectable}
        />
      ) : null}
    </TableBody>
  );
}
