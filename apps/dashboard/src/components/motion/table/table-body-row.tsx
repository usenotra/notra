"use client";

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuTrigger,
} from "@notra/ui/components/ui/context-menu";

import { Checkbox } from "@/components/motion/checkbox";
import { cn } from "@/lib/utils";

import { EditableCell } from "./editable-cell";
import type { TableColumn, TableProps, TableRow } from "./types";
import { alignText, readCell, TABLE_CELL_INNER_CLASS } from "./utils";

const INTERACTIVE_SELECTOR =
  'button, a, input, select, textarea, label, [role="checkbox"], [role="switch"], [role="menuitem"], [role="button"], [contenteditable="true"]';

function isInteractiveTarget(target: EventTarget | null): boolean {
  return (
    target instanceof Element && target.closest(INTERACTIVE_SELECTOR) !== null
  );
}

export function TableBodyRow<T>({
  entry,
  index,
  isLastRow,
  rowHeight,
  rowSizing,
  selectable,
  isSelected,
  columns,
  onRowClick,
  onRowPointerEnter,
  hasRowMenu,
  onActivate,
  onDeactivate,
  onToggleRow,
  onCellEdit,
  renderRowContextMenu,
  rowRef,
}: {
  entry: TableRow<T>;
  index: number;
  isLastRow: boolean;
  rowHeight: number;
  rowSizing: TableProps<T>["rowSizing"];
  selectable: boolean;
  isSelected: boolean;
  columns: TableColumn<T>[];
  onRowClick?: (row: T) => void;
  onRowPointerEnter?: (row: T) => void;
  hasRowMenu: boolean;
  onActivate?: (id: string, index: number) => void;
  onDeactivate?: () => void;
  onToggleRow: (id: string) => void;
  onCellEdit?: (rowId: string, columnKey: string, value: string) => void;
  renderRowContextMenu: TableProps<T>["renderRowContextMenu"];
  rowRef: (el: HTMLTableRowElement | null) => void;
}) {
  // The virtualizer's bottom spacer <tr> can be :last-child, so a CSS
  // last-child rule misses the real final row; flag it explicitly instead.
  const cellBorder = isLastRow ? "border-b-0" : "border-border/60 border-b";
  const tableRow = (
    <tr
      className={cn(
        "group transition-colors",
        "data-[selected=true]:bg-primary/5",
        "hover:bg-muted/50",
        onRowClick && "cursor-pointer"
      )}
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
        onRowClick
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
        hasRowMenu || onRowPointerEnter
          ? () => {
              if (hasRowMenu) {
                onActivate?.(entry.id, index);
              }
              onRowPointerEnter?.(entry.row);
            }
          : undefined
      }
      onPointerLeave={hasRowMenu ? onDeactivate : undefined}
      ref={rowRef}
      style={
        rowSizing === "content"
          ? { minHeight: rowHeight }
          : { height: rowHeight }
      }
      tabIndex={onRowClick ? 0 : undefined}
    >
      {selectable ? (
        <td className={cn("text-center", cellBorder)}>
          <div className="flex items-center justify-center">
            <Checkbox
              aria-label={`Select row ${index + 1}`}
              checked={isSelected}
              className="size-6"
              onCheckedChange={() => onToggleRow(entry.id)}
            />
          </div>
        </td>
      ) : null}
      {columns.map((column) => (
        <td
          className={cn(
            "text-foreground max-w-0 overflow-hidden px-4",
            cellBorder,
            alignText(column.align)
          )}
          key={column.key}
        >
          <div
            className={cn(
              TABLE_CELL_INNER_CLASS,
              rowSizing === "content" &&
                "overflow-visible py-3 whitespace-normal",
              alignText(column.align)
            )}
          >
            {!column.cell && column.editable ? (
              <EditableCell
                label={`${column.key} for row ${index + 1}`}
                onChange={(next) => onCellEdit?.(entry.id, column.key, next)}
                value={String(readCell(entry.row, column) ?? "")}
              />
            ) : (
              readCell(entry.row, column)
            )}
          </div>
        </td>
      ))}
      <td aria-hidden className={cellBorder} />
    </tr>
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
