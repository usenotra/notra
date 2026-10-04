"use client";

import { cn } from "cn";
import { useRef } from "react";

import {
  CHECKBOX_COLUMN_WIDTH,
  DATA_TABLE_HEIGHT,
  DATA_TABLE_OVERSCAN,
  DATA_TABLE_ROW_HEIGHT,
  DATA_TABLE_SKELETON_ROWS,
  DEFAULT_MIN_COLUMN_WIDTH,
  TABLE_FRAME_INSET,
} from "../constants/data-table";
import { useCollapsibleColumns } from "../hooks/use-collapsible-columns";
import { useColumnResize } from "../hooks/use-column-resize";
import { useColumnSort } from "../hooks/use-column-sort";
import { useRowSelection } from "../hooks/use-row-selection";
import { useTablePaging } from "../hooks/use-table-paging";
import { useTableViewport } from "../hooks/use-table-viewport";
import {
  pinRowsFirst,
  tableLoadingOverlay,
  tableLayout,
} from "../lib/data-table";
import type { DataTableRootProps, HeaderCellRefs } from "../types/data-table";
import { DataTableBody } from "./data-table-body";
import { DataTableColumnGroup } from "./data-table-column-group";
import { DataTableHeader } from "./data-table-header";
import {
  DataTableLabelsProvider,
  useDataTableLabels,
} from "./data-table-labels";
import { DataTablePager } from "./data-table-pager";
import {
  TableBodySurface,
  TableFooterSurface,
  TableFrame,
  TableHeaderSurface,
  TableScrollFade,
} from "./data-table-surfaces";

/** Shared engine behind `DataTable` and `InfiniteDataTable`. */
export function DataTableRoot<T>(props: DataTableRootProps<T>) {
  return (
    <DataTableLabelsProvider labels={props.labels}>
      <DataTableRootInner {...props} />
    </DataTableLabelsProvider>
  );
}

function DataTableRootInner<T>({
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
  height: heightProp,
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
  scrollFade = true,
  className,
}: DataTableRootProps<T>) {
  const labels = useDataTableLabels();
  const emptyState = emptyStateProp ?? labels.noData;
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
  const paging = useTablePaging(displayRows, pagination, visibleRowCount);
  const { pagedRows } = paging;
  const footerContent =
    footer || pagination ? (
      <>
        {footer}
        {pagination ? (
          <DataTablePager
            onClientPageSizeChange={paging.onClientPageSizeChange}
            pagination={paging.pagination ?? pagination}
            rowCount={displayRows.length}
          />
        ) : null}
      </>
    ) : undefined;

  // A paged table shows its whole page by default; only an explicit `height`
  // caps it with a scrolling body.
  const height =
    heightProp ??
    (pagination
      ? (Math.max(pagedRows.length, 1) + 1) * rowHeight
      : DATA_TABLE_HEIGHT);
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
    atStart,
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
  const layout = tableLayout(
    visibleColumns,
    widths,
    minColumnWidth,
    selectable ? [CHECKBOX_COLUMN_WIDTH] : []
  );
  const tableClassName = cn(
    "border-separate border-spacing-0 text-sm tabular-nums",
    layout.className
  );
  const tableStyle = layout.style;

  return (
    <div
      aria-busy={loading}
      className={cn("w-full min-w-0 text-sm", className)}
      data-slot="data-table"
      ref={containerRef}
    >
      <TableFrame flushBottom={flushBottom} flushTop={flushTop}>
        <TableHeaderSurface flushTop={flushTop} toolbar={toolbar}>
          {/* Transparent side borders match the body's, so both tables get the
              same width and the columns line up. */}
          <div
            className="overflow-hidden border-x border-transparent"
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
          isEmpty={isEmpty}
          loadingState={loadingState}
          onScroll={handleScroll}
          overflowClass={overflowClass}
          scrollRef={scrollRef}
          style={bodyStyle}
        >
          <TableScrollFade
            edge="top"
            hidden={atStart}
            scrollFade={scrollFade}
          />
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
          <TableScrollFade
            edge="bottom"
            hidden={atEnd}
            scrollFade={scrollFade}
          />
        </TableBodySurface>
        <TableFooterSurface footer={footerContent} />
      </TableFrame>
    </div>
  );
}
