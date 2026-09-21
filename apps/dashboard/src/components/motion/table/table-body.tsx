import { AnimatePresence, motion } from "motion/react";
import { Fragment } from "react";

import { cn } from "@/lib/utils";
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
  renderRowDetail,
  reduce,
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
      {renderedRows.map(({ entry, index }) => {
        const renderedDetail = renderRowDetail?.(entry.row);
        const detail =
          typeof renderedDetail === "boolean" ? null : (renderedDetail ?? null);
        const detailId = detail === null ? undefined : `${entry.id}-detail`;
        return (
          <Fragment key={entry.id}>
            <TableBodyRow
              columns={columns}
              detailId={detailId}
              entry={entry}
              hasRowMenu={hasRowMenu}
              index={index}
              isLastRow={index === rowCount - 1 && detail === null}
              isSelected={selected.has(entry.id)}
              expanded={renderRowDetail ? detail !== null : undefined}
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
            {renderRowDetail ? (
              <AnimatePresence initial={false}>
                {detail === null ? null : (
                  <motion.tr
                    animate="open"
                    exit="closed"
                    id={detailId}
                    initial="closed"
                    key={`${entry.id}-detail`}
                  >
                    <td
                      className={cn(
                        "bg-muted/20 p-0",
                        index === rowCount - 1 ? undefined : "border-b"
                      )}
                      colSpan={colSpan}
                    >
                      <motion.div
                        animate="open"
                        className="overflow-hidden"
                        exit="closed"
                        initial="closed"
                        transition={
                          reduce
                            ? { duration: 0 }
                            : { duration: 0.2, ease: [0.23, 1, 0.32, 1] }
                        }
                        variants={{
                          closed: { height: 0, opacity: 0 },
                          open: { height: "auto", opacity: 1 },
                        }}
                      >
                        {detail}
                      </motion.div>
                    </td>
                  </motion.tr>
                )}
              </AnimatePresence>
            ) : null}
          </Fragment>
        );
      })}
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
