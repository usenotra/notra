import { CHECKBOX_COLUMN_WIDTH } from "../constants/data-table";
import {
  colWidthStyle,
  headerMinWidth,
  isFrWidth,
  resolveColumnWidths,
} from "../lib/data-table";
import type { TableColumnGroupProps } from "../types/data-table";

export function DataTableColumnGroup<T>({
  columns,
  widths,
  selectable,
  minColumnWidth,
}: TableColumnGroupProps<T>) {
  const resolvedWidths = resolveColumnWidths(
    columns,
    selectable ? [CHECKBOX_COLUMN_WIDTH] : []
  );
  // The trailing spacer only takes leftover room when every column is fixed;
  // otherwise it would split the space with the flexible columns.
  const hasFlexibleColumn = columns.some(
    (column) =>
      widths[column.key] == null && (!column.width || isFrWidth(column.width))
  );

  return (
    <colgroup>
      {selectable ? (
        <col
          style={{
            width: CHECKBOX_COLUMN_WIDTH,
            minWidth: CHECKBOX_COLUMN_WIDTH,
          }}
        />
      ) : null}
      {columns.map((column, index) => {
        const override = widths[column.key];
        const width = override ? `${override}px` : resolvedWidths[index];
        const flexible =
          override == null && (!column.width || isFrWidth(column.width));
        const minWidth = headerMinWidth(column, minColumnWidth);
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
