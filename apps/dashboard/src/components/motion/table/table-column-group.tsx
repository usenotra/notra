import type { TableColumnGroupProps } from "@/types/table";

import {
  CHECKBOX_WIDTH,
  colWidthStyle,
  headerMinWidth,
  isFrWidth,
  REORDER_HANDLE_PX,
  resolveColumnWidths,
} from "./utils";

export function TableColumnGroup<T>({
  columns,
  widths,
  selectable,
  reorderable,
  minColumnWidth,
}: TableColumnGroupProps<T>) {
  const resolvedWidths = resolveColumnWidths(
    columns,
    selectable ? [CHECKBOX_WIDTH] : []
  );
  const hasFlexibleColumn = columns.some(
    (column) => widths[column.key] == null && isFrWidth(column.width)
  );

  return (
    <colgroup>
      {selectable ? (
        <col style={{ width: CHECKBOX_WIDTH, minWidth: CHECKBOX_WIDTH }} />
      ) : null}
      {columns.map((column, index) => {
        const override = widths[column.key];
        const width = override ? `${override}px` : resolvedWidths[index];
        const flexible = override == null && isFrWidth(column.width);
        const minWidth = headerMinWidth(
          column,
          minColumnWidth,
          reorderable ? REORDER_HANDLE_PX : 0
        );
        return (
          <col
            key={column.key}
            style={colWidthStyle(width, flexible, minWidth)}
          />
        );
      })}
      <col style={hasFlexibleColumn ? { width: 0 } : undefined} />
    </colgroup>
  );
}
