import type { TablePaginationRange } from "@notra/ui/types/table-pagination";
import type {
  CSSProperties,
  PointerEvent as ReactPointerEvent,
  ReactNode,
  RefObject,
  UIEventHandler,
} from "react";

type SortDirection = "asc" | "desc";

export interface SortState {
  key: string;
  direction: SortDirection;
}

export interface TableColumn<T> {
  /** Stable key; also the default object property read for the cell + sort value. */
  key: string;
  /** Header content. */
  header: ReactNode;
  /**
   * Explains what the column counts, on an info icon beside the header. For
   * columns whose name alone leaves the reader guessing how they relate to
   * their neighbours.
   */
  hint?: ReactNode;
  /** Allow clicking the header to sort by this column. */
  sortable?: boolean;
  /** Cell text alignment. */
  align?: "left" | "center" | "right";
  /** Column width as a CSS length, e.g. "160px", "20%" or "2fr". Omit to share remaining space equally. */
  width?: string;
  /** Floor for this column. Defaults to the header label plus sort/padding chrome so titles never ellipsize. */
  minWidth?: string;
  /**
   * Lets the column drop out when the table is narrower than its column
   * floors, instead of scrolling sideways. Higher numbers are hidden first;
   * columns without a priority always stay.
   */
  collapsePriority?: number;
  /** Custom cell renderer. Falls back to `row[key]`. */
  cell?: (row: T) => ReactNode;
  /** Value used for sorting. Falls back to `row[key]`. */
  sortValue?: (row: T) => string | number;
}

interface DataTablePaginationBase {
  /** 1-based current page. */
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  /** Noun after the range, e.g. "items" in "1-20 of 64 items". */
  itemLabel?: string;
  /** Replaces the whole range text, e.g. to add a refresh note. */
  formatRange?: (range: TablePaginationRange) => string;
  /**
   * Lets the reader pick the page size in the footer. Client paging works
   * without it (the table keeps the choice); server and cursor paging need it
   * to refetch, and fall back to the range text when it is missing.
   */
  onPageSizeChange?: (pageSize: number) => void;
  /** Page sizes offered in the footer select. */
  pageSizeOptions?: readonly number[];
}

/** Every row is loaded; the table slices `data` after sorting. */
export interface DataTableClientPagination extends DataTablePaginationBase {
  mode?: "client";
}

/** `data` is already the current page; the server knows the total. */
export interface DataTableServerPagination extends DataTablePaginationBase {
  mode: "server";
  totalItems: number;
}

/** `data` is the current page and only "is there more" is known. */
export interface DataTableCursorPagination extends DataTablePaginationBase {
  mode: "cursor";
  hasNextPage: boolean;
}

export type DataTablePagination =
  | DataTableClientPagination
  | DataTableServerPagination
  | DataTableCursorPagination;

export interface DataTableProps<T> {
  data: readonly T[];
  columns: TableColumn<T>[];
  /** Stable id per row, required for correct selection across sorts. Defaults to row index. */
  getRowId?: (row: T, index: number) => string;
  /** Render a leading checkbox column with select-all in the header. */
  selectable?: boolean;
  selectedRowIds?: string[];
  defaultSelectedRowIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  sort?: SortState | null;
  defaultSort?: SortState | null;
  onSortChange?: (sort: SortState | null) => void;
  /** Rows already arrive sorted (for example by the server); header clicks only report the sort. */
  manualSort?: boolean;
  /** Allow dragging the right edge of a header to resize that column. */
  resizable?: boolean;
  /** Minimum column width in px when resizing. */
  minColumnWidth?: number;
  onColumnResize?: (key: string, width: number) => void;
  /** Fixed row height in px — required for virtualization. */
  rowHeight?: number;
  /** Header row height in px; defaults to `rowHeight`. */
  headerHeight?: number;
  /** Content-sized rows wrap and render without virtualization. Use for bounded detail lists. */
  rowSizing?: "fixed" | "content";
  /** Scroll viewport height in px. */
  height?: number;
  /** Floor for the table body when there are fewer rows than `height` allows. */
  minHeight?: number;
  /**
   * Content-sized rows only: grow with the rows instead of capping at
   * `height`, so the body never scrolls on its own. `height` still sizes the
   * empty and loading states.
   */
  autoHeight?: boolean;
  /** Rows rendered above/below the viewport. */
  overscan?: number;
  /**
   * Currently fetching. Empty tables fill with skeleton rows; tables that
   * already have rows dim in place.
   */
  loading?: boolean;
  /** How many skeleton rows to show while loading more (default 3). */
  skeletonRows?: number;
  /** Called when a row is clicked or activated with Enter/Space. */
  onRowClick?: (row: T) => void;
  /** Set false when a native control inside the row provides its keyboard action. */
  rowKeyboardActivation?: boolean;
  /** Only matching rows receive click handlers, keyboard activation, and pointer styling. */
  isRowClickable?: (row: T) => boolean;
  /** Extra classes for a row, e.g. to animate rows that just arrived. */
  getRowClassName?: (row: T) => string | undefined;
  /** Menu content shown when a row is opened with the context-menu gesture. */
  renderRowContextMenu?: (row: T) => ReactNode;
  /** Full-width row rendered under a row; return null to keep it collapsed. */
  renderRowDetail?: (row: T) => ReactNode;
  /** Called when a pointer enters a row — prefetch, hover menus, etc. */
  onRowPointerEnter?: (row: T) => void;
  /** Keep matching rows first after sort. They scroll with the table (not sticky). */
  isRowPinned?: (row: T) => boolean;
  /** Content rendered above the column headers inside the table surface. */
  toolbar?: ReactNode;
  /** Content rendered below the body on the shell, mirroring the header. */
  footer?: ReactNode;
  /** Page the rows and render the pager in the footer. Omit to render every row. */
  pagination?: DataTablePagination;
  emptyState?: ReactNode;
  /** Join the shell of the table above: no top border or radius, rim kept. */
  flushTop?: boolean;
  /** Join the shell of the table below: no bottom border or radius, rim kept. */
  flushBottom?: boolean;
  /** Fade the top and bottom edges while more rows are scrolled out of view. Default on. */
  scrollFade?: boolean;
  className?: string;
}

export interface InfiniteDataTableProps<T>
  extends Omit<DataTableProps<T>, "rowSizing" | "pagination"> {
  /** Render only the first N rows after sorting; grow it to reveal more. */
  visibleRowCount?: number;
  /** Fires when the viewport scrolls near the bottom. Clear it when there is no next page. */
  onEndReached: (() => void) | undefined;
  /** Next page is being fetched; appends `skeletonRows` at the bottom. */
  loadingMore?: boolean;
}

/** Engine props shared by both public tables. */
export interface DataTableRootProps<T> extends DataTableProps<T> {
  visibleRowCount?: number;
  onEndReached?: () => void;
  loadingMore?: boolean;
}

/** A data row paired with its stable id. */
export interface TableRow<T> {
  row: T;
  id: string;
}

/** Ref map from column key to its header cell, shared across the resize hook. */
export interface HeaderCellRefs {
  current: Record<string, HTMLTableCellElement | null>;
}

export interface DataTableSkeletonProps {
  columnWidths?: readonly string[];
  rows?: number;
  rowHeight?: number;
  toolbar?: ReactNode;
  className?: string;
}

export interface TableHeaderSurfaceProps extends Pick<
  DataTableProps<unknown>,
  "toolbar" | "flushTop"
> {
  children: ReactNode;
}

export interface TableFrameProps extends Pick<
  DataTableProps<unknown>,
  "flushTop" | "flushBottom"
> {
  children: ReactNode;
}

export type TableFooterSurfaceProps = Pick<DataTableProps<unknown>, "footer">;

export interface TableScrollFadeProps extends Pick<
  DataTableProps<unknown>,
  "scrollFade"
> {
  edge: "top" | "bottom";
  /** No rows hidden past this edge, so the fade is not shown. */
  hidden: boolean;
}

export type TableLoadingState = "dimmed" | "more" | "skeleton";

export interface TableLoadingOverlay {
  loadingMore: boolean;
  dimRows: boolean;
  loadingState: TableLoadingState | undefined;
}

export interface TableBodySurfaceProps {
  isEmpty: boolean;
  overflowClass: string;
  dimRows: boolean;
  loadingState: TableLoadingState | undefined;
  onScroll: UIEventHandler<HTMLDivElement>;
  scrollRef: RefObject<HTMLDivElement | null>;
  style: CSSProperties;
  children: ReactNode;
}

export interface TableColumnGroupProps<T> {
  columns: TableColumn<T>[];
  widths: Record<string, number>;
  selectable: boolean;
  minColumnWidth: number;
}

export interface DataTableHeaderProps<T> {
  columns: TableColumn<T>[];
  rowHeight: number;
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
}

export interface TableViewportLayoutOptions {
  rowCount: number;
  rowHeight: number;
  headerHeight?: number;
  rowSizing: NonNullable<DataTableProps<unknown>["rowSizing"]>;
  height: number;
  minHeight?: number;
  autoHeight?: boolean;
  horizontalScrollbarHeight: number;
}

export interface TableViewportLayout {
  bodyHeight: number;
  scrolls: boolean;
  overflowClass: string;
  bodyStyle: CSSProperties;
  headerStyle: CSSProperties | undefined;
}

export interface UseTableViewportOptions<T> extends Omit<
  TableViewportLayoutOptions,
  "rowCount" | "horizontalScrollbarHeight"
> {
  rows: TableRow<T>[];
  overscan: number;
  loading: boolean;
  onEndReached?: () => void;
}

export interface DataTableBodyProps<T> extends Pick<
  DataTableProps<T>,
  | "onRowClick"
  | "rowKeyboardActivation"
  | "isRowClickable"
  | "getRowClassName"
  | "onRowPointerEnter"
  | "renderRowContextMenu"
  | "renderRowDetail"
  | "emptyState"
  | "rowSizing"
> {
  columns: TableColumn<T>[];
  renderedRows: { entry: TableRow<T>; index: number }[];
  rowCount: number;
  rowHeight: number;
  bodyHeight: number;
  loading: boolean;
  loadingMore: boolean;
  skeletonRows: number;
  selectable: boolean;
  selected: Set<string>;
  scrolls: boolean;
  paddingTop: number;
  paddingBottom: number;
  onToggleRow: (id: string) => void;
}

export interface DataTableBodyRowProps<T> extends Pick<
  DataTableProps<T>,
  | "onRowClick"
  | "rowKeyboardActivation"
  | "onRowPointerEnter"
  | "renderRowContextMenu"
  | "rowSizing"
> {
  className?: string;
  entry: TableRow<T>;
  index: number;
  isLastRow: boolean;
  expanded?: boolean;
  detailId?: string;
  rowHeight: number;
  selectable: boolean;
  isSelected: boolean;
  columns: TableColumn<T>[];
  onToggleRow: (id: string) => void;
}

export interface DataTablePagerProps {
  pagination: DataTablePagination;
  /** Client paging only: the table owns the page size when the caller does not. */
  onClientPageSizeChange?: (pageSize: number) => void;
  /** Rows across all pages, used by client pagination. */
  rowCount: number;
}
