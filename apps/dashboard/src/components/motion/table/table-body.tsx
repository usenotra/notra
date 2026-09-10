import type { TableBodyProps } from "@/types/table";

import { SkeletonRows } from "./skeleton-rows";
import { TableBodyRow } from "./table-body-row";

export function TableBody<T>({
  columns,
  renderedRows,
  rowCount,
  rowHeight,
  rowSizing,
  bodyHeight,
  loading,
  skeletonRows,
  emptyState,
  selectable,
  selected,
  scrolls,
  paddingTop,
  paddingBottom,
  hasRowMenu,
  onActivate,
  onDeactivate,
  onToggleRow,
  onCellEdit,
  onRowClick,
  isRowClickable,
  onRowPointerEnter,
  renderRowContextMenu,
  rowRefs,
}: TableBodyProps<T>) {
  const colSpan = columns.length + (selectable ? 1 : 0) + 1;

  if (rowCount === 0) {
    return (
      <tbody>
        {loading ? (
          <SkeletonRows
            columns={columns}
            count={Math.max(1, Math.ceil(bodyHeight / rowHeight))}
            rowHeight={rowHeight}
            selectable={selectable}
          />
        ) : (
          <tr>
            <td className="p-0" colSpan={colSpan}>
              <div
                className="text-muted-foreground flex items-center justify-center px-6 text-center"
                style={{ height: bodyHeight }}
              >
                {emptyState}
              </div>
            </td>
          </tr>
        )}
      </tbody>
    );
  }

  return (
    <tbody>
      {scrolls && paddingTop > 0 ? (
        <tr aria-hidden style={{ height: paddingTop }}>
          <td colSpan={colSpan} />
        </tr>
      ) : null}
      {renderedRows.map(({ entry, index }) => (
        <TableBodyRow
          columns={columns}
          entry={entry}
          hasRowMenu={hasRowMenu}
          index={index}
          isLastRow={index === rowCount - 1}
          isSelected={selected.has(entry.id)}
          key={entry.id}
          onActivate={onActivate}
          onCellEdit={onCellEdit}
          onDeactivate={onDeactivate}
          onRowClick={
            !isRowClickable || isRowClickable(entry.row)
              ? onRowClick
              : undefined
          }
          onRowPointerEnter={onRowPointerEnter}
          onToggleRow={onToggleRow}
          renderRowContextMenu={renderRowContextMenu}
          rowHeight={rowHeight}
          rowSizing={rowSizing}
          rowRef={(element) => {
            rowRefs.current[entry.id] = element;
          }}
          selectable={selectable}
        />
      ))}
      {scrolls && paddingBottom > 0 ? (
        <tr aria-hidden style={{ height: paddingBottom }}>
          <td colSpan={colSpan} />
        </tr>
      ) : null}
      {loading ? (
        <SkeletonRows
          columns={columns}
          count={skeletonRows}
          rowHeight={rowHeight}
          selectable={selectable}
        />
      ) : null}
    </tbody>
  );
}
