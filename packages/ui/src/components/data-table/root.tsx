"use client";

import { useReducedMotion } from "motion/react";
import { useRef, useState } from "react";

import { useUiLabels } from "@notra/ui/components/shared/ui-labels-provider";
import {
  CHECKBOX_COLUMN_WIDTH,
  DATA_TABLE_HEIGHT,
  DATA_TABLE_OVERSCAN,
  DATA_TABLE_ROW_HEIGHT,
  DATA_TABLE_SKELETON_ROWS,
  DEFAULT_MIN_COLUMN_WIDTH,
  TABLE_FRAME_INSET,
} from "@notra/ui/constants/table";
import { useCollapsibleColumns } from "@notra/ui/hooks/use-collapsible-columns";
import { useColumnResize } from "@notra/ui/hooks/use-column-resize";
import { useColumnSort } from "@notra/ui/hooks/use-column-sort";
import { useRowSelection } from "@notra/ui/hooks/use-row-selection";
import { useTableViewport } from "@notra/ui/hooks/use-table-viewport";
import {
  pageRows,
  pinRowsFirst,
  tableLoadingOverlay,
  tableMinWidthCss,
} from "@notra/ui/lib/data-table";
import { cn } from "@notra/ui/lib/utils";
import type {
  DataTableRootProps,
  HeaderCellRefs,
} from "@notra/ui/types/data-table";

import { DataTableBody } from "./body";
import { DataTableColumnGroup } from "./column-group";
import { DataTableHeader } from "./header";
import { DataTablePager } from "./pager";
import {
  TableBodySurface,
  TableFooterSurface,
  TableFrame,
  TableHeaderSurface,
  TableScrollFade,
} from "./surfaces";

/** Shared engine behind `DataTable` and `InfiniteDataTable`. */
export function DataTableRoot<T>({
  data,
  columns,
  getRowId,
  selectable = false,
  selectedRowIds,
  defaultSelectedRowIds,
  onSelectionChange,
  sort: sortProp,
  defaultSort = null,
  onSortChange,
  manualSort = false,
  resizable = false,
  minColumnWidth = DEFAULT_MIN_COLUMN_WIDTH,
  onColumnResize,
  rowHeight = DATA_TABLE_ROW_HEIGHT,
  rowSizing = "fixed",
  height = DATA_TABLE_HEIGHT,
  minHeight,
  autoHeight = false,
  overscan = DATA_TABLE_OVERSCAN,
  onEndReached,
  loading = false,
  loadingMore: loadingMoreProp,
  skeletonRows = DATA_TABLE_SKELETON_ROWS,
  emptyState: emptyStateProp,
  onRowClick,
  rowKeyboardActivation = true,
  isRowClickable,
  getRowClassName,
  renderRowContextMenu,
  onRowPointerEnter,
  isRowPinned,
  toolbar,
  footer,
  pagination,
  visibleRowCount,
  flushTop = false,
  flushBottom = false,
  overlapTop = false,
  scrollFade = true,
  className,
}: DataTableRootProps<T>) {
  const labels = useUiLabels();
  const emptyState = emptyStateProp ?? labels.noData;
  const reduce = useReducedMotion();
  const thRefs: HeaderCellRefs = useRef<
    Record<string, HTMLTableCellElement | null>
  >({});
  const rows = data.map((row, index) => ({
    row,
    id: getRowId ? getRowId(row, index) : String(index),
  }));
  const { containerRef, visibleColumns } = useCollapsibleColumns(columns, {
    minColumnWidth,
    extraFixedWidths: selectable
      ? [TABLE_FRAME_INSET, CHECKBOX_COLUMN_WIDTH]
      : [TABLE_FRAME_INSET],
  });
  const { sort, sortedRows, toggleSort } = useColumnSort({
    rows,
    columns,
    sort: sortProp,
    defaultSort,
    onSortChange,
    manualSort,
  });
  const { widths, startResize, moveResize, endResize } = useColumnResize({
    orderedColumns: visibleColumns,
    thRefs,
    minColumnWidth,
    onColumnResize,
  });
  const { selected, allSelected, someSelected, toggleAll, toggleRow } =
    useRowSelection({
      sortedRows,
      selectedRowIds,
      defaultSelectedRowIds,
      onSelectionChange,
    });
  const displayRows = pinRowsFirst(sortedRows, isRowPinned);
  // Only client pagination slices here; server and cursor pages arrive as `data`.
  // Client paging keeps the reader's page size itself unless the caller
  // controls it through `onPageSizeChange`.
  const [clientPageSize, setClientPageSize] = useState<number | null>(null);
  const clientPagingProp =
    pagination?.mode === undefined || pagination.mode === "client"
      ? pagination
      : undefined;
  const ownsPageSize = Boolean(
    clientPagingProp && !clientPagingProp.onPageSizeChange
  );
  const clientPaging =
    clientPagingProp && ownsPageSize && clientPageSize !== null
      ? { ...clientPagingProp, pageSize: clientPageSize }
      : clientPagingProp;
  const effectivePagination = clientPaging ?? pagination;
  const clientPageCount = clientPaging
    ? Math.max(1, Math.ceil(displayRows.length / clientPaging.pageSize))
    : 1;
  const pagedRows = clientPaging
    ? pageRows(
        displayRows,
        Math.min(Math.max(1, clientPaging.page), clientPageCount),
        clientPaging.pageSize
      )
    : pageRows(displayRows, 1, visibleRowCount);
  const footerContent =
    footer || pagination ? (
      <>
        {footer}
        {pagination ? (
          <DataTablePager
            onClientPageSizeChange={ownsPageSize ? setClientPageSize : undefined}
            pagination={effectivePagination ?? pagination}
            rowCount={displayRows.length}
          />
        ) : null}
      </>
    ) : undefined;

  const {
    headerScrollRef,
    scrollRef,
    headerStyle,
    bodyStyle,
    overflowClass,
    handleScroll,
    renderedRows,
    bodyHeight,
    scrolls,
    paddingTop,
    paddingBottom,
    atEnd,
  } = useTableViewport({
    rows: pagedRows,
    rowHeight,
    rowSizing,
    height,
    minHeight,
    autoHeight,
    overscan,
    loading,
    onEndReached,
  });
  const columnGroup = (
    <DataTableColumnGroup
      columns={visibleColumns}
      minColumnWidth={minColumnWidth}
      selectable={selectable}
      widths={widths}
    />
  );
  const isEmpty = pagedRows.length === 0 && !loading;
  const { loadingMore, dimRows, loadingState } = tableLoadingOverlay(
    loading,
    pagedRows.length,
    loadingMoreProp,
    Boolean(onEndReached)
  );
  // Shrink-wrap only after every column has an explicit resized width.
  const sized =
    visibleColumns.length > 0 &&
    visibleColumns.every((column) => widths[column.key] != null);
  const tableClassName = cn(
    "border-separate border-spacing-0 text-sm tabular-nums",
    sized ? "w-max min-w-full" : "w-full"
  );
  const minTableWidth = tableMinWidthCss(
    visibleColumns,
    minColumnWidth,
    selectable ? [CHECKBOX_COLUMN_WIDTH] : []
  );
  const tableStyle = { tableLayout: "fixed" as const, minWidth: minTableWidth };

  return (
    <div
      aria-busy={loading}
      className={cn("w-full min-w-0 text-sm", className)}
      data-slot="data-table"
      ref={containerRef}
    >
      <TableFrame flushBottom={flushBottom} flushTop={flushTop}>
        <TableHeaderSurface
          flushTop={flushTop}
          overlapTop={overlapTop}
          toolbar={toolbar}
        >
          <div
            className="overflow-hidden"
            ref={headerScrollRef}
            style={headerStyle}
          >
            <table className={tableClassName} style={tableStyle}>
              {columnGroup}
              <DataTableHeader
                allSelected={allSelected}
                columns={visibleColumns}
                minColumnWidth={minColumnWidth}
                onResizeEnd={endResize}
                onResizeMove={moveResize}
                onResizeStart={startResize}
                onToggleAll={toggleAll}
                onToggleSort={toggleSort}
                reduce={Boolean(reduce)}
                resizable={resizable}
                rowHeight={rowHeight}
                selectable={selectable}
                someSelected={someSelected}
                sort={sort}
                thRefs={thRefs}
              />
            </table>
          </div>
        </TableHeaderSurface>
        <TableBodySurface
          dimRows={dimRows}
          flushBottom={flushBottom}
          hasFooter={Boolean(footerContent)}
          isEmpty={isEmpty}
          loadingState={loadingState}
          onScroll={handleScroll}
          overflowClass={overflowClass}
          scrollRef={scrollRef}
          style={bodyStyle}
        >
          <table className={tableClassName} style={tableStyle}>
            {columnGroup}
            <DataTableBody
              bodyHeight={bodyHeight}
              columns={visibleColumns}
              emptyState={emptyState}
              getRowClassName={getRowClassName}
              isRowClickable={isRowClickable}
              loading={loading}
              loadingMore={loadingMore}
              onRowClick={onRowClick}
              onRowPointerEnter={onRowPointerEnter}
              onToggleRow={toggleRow}
              paddingBottom={paddingBottom}
              paddingTop={paddingTop}
              renderRowContextMenu={renderRowContextMenu}
              renderedRows={renderedRows}
              rowCount={pagedRows.length}
              rowHeight={rowHeight}
              rowKeyboardActivation={rowKeyboardActivation}
              rowSizing={rowSizing}
              scrolls={scrolls}
              selectable={selectable}
              selected={selected}
              skeletonRows={skeletonRows}
            />
          </table>
          <TableScrollFade atEnd={atEnd} scrollFade={scrollFade} />
        </TableBodySurface>
        <TableFooterSurface flushBottom={flushBottom} footer={footerContent} />
      </TableFrame>
    </div>
  );
}
