import type { ReactNode } from "react";

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
  /** Column width as a CSS length, e.g. "160px" or "20%". Omit to share remaining space equally. */
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
  /** Render an inline text input for this column's cells (ignored when `cell` is set). */
  editable?: boolean;
  /** Value used for sorting. Falls back to `row[key]`. */
  sortValue?: (row: T) => string | number;
}

export type InsertPosition = "before" | "after";

interface TableBaseProps<T> {
  data: T[];
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
  /** Allow dragging a header grip to reorder columns. */
  reorderable?: boolean;
  onColumnOrderChange?: (keys: string[]) => void;
  /** Called when an `editable` cell changes. */
  onCellEdit?: (rowId: string, columnKey: string, value: string) => void;
  /** When set, non-sortable headers become editable inputs for the column name. */
  onColumnRename?: (columnKey: string, value: string) => void;
  /** Enables the row menu (Insert before / after). Receives the target index. */
  onInsertRow?: (index: number, position: InsertPosition) => void;
  /** Enables Delete in the row menu. */
  onDeleteRow?: (rowId: string, index: number) => void;
  /** Enables the column menu (Insert before / after). Receives the target column index. */
  onInsertColumn?: (index: number, position: InsertPosition) => void;
  /** Enables Delete in the column menu. */
  onDeleteColumn?: (columnKey: string, index: number) => void;
  /** Fixed row height in px — required for virtualization. */
  rowHeight?: number;
  /** Scroll viewport height in px. */
  height?: number;
  /** Floor for the table body when there are fewer rows than `height` allows. */
  minHeight?: number;
  /** Rows rendered above/below the viewport. */
  overscan?: number;
  /** Fires when the viewport scrolls near the bottom — load the next page. */
  onEndReached?: () => void;
  /** Currently fetching — shows skeleton rows and pauses `onEndReached`. */
  loading?: boolean;
  /** How many skeleton rows to show while loading more (default 3). */
  skeletonRows?: number;
  /** Called when a row is clicked or activated with Enter/Space. */
  onRowClick?: (row: T) => void;
  /** Only matching rows receive click handlers, keyboard activation, and pointer styling. */
  isRowClickable?: (row: T) => boolean;
  /** Menu content shown when a row is opened with the context-menu gesture. */
  renderRowContextMenu?: (row: T) => ReactNode;
  /** Called when a pointer enters a row — prefetch, hover menus, etc. */
  onRowPointerEnter?: (row: T) => void;
  /** Keep matching rows first after sort. They scroll with the table (not sticky). */
  isRowPinned?: (row: T) => boolean;
  /** Content rendered above the column headers inside the table surface. */
  toolbar?: ReactNode;
  /** Content rendered below the body on a muted footer surface that mirrors the header. */
  footer?: ReactNode;
  /** 1-based page to render when `pageSize` is set. Rows are sliced after sorting. */
  page?: number;
  /** Rows per page. Omit to render every row. */
  pageSize?: number;
  emptyState?: ReactNode;
  /** Square off the top edge so the table can sit flush under another surface. */
  flushTop?: boolean;
  /** Square off the bottom edge so another surface can sit flush beneath the table. */
  flushBottom?: boolean;
  /** Pad the header band so the table can tuck 20px under the rounded bottom of a surface above it. */
  overlapTop?: boolean;
  /** Fade the bottom edge while more rows can be scrolled into view. */
  scrollFade?: boolean;
  className?: string;
}

export type TableProps<T> = TableBaseProps<T> &
  (
    | {
        /** Content-sized rows wrap and render without virtualization. Use for bounded detail lists. */
        rowSizing?: "fixed" | "content";
        renderRowDetail?: never;
      }
    | {
        /** Detail rows require content sizing because fixed sizing relies on one row per estimate. */
        rowSizing: "content";
        /** Detail panel rendered in a full-width row beneath a row. Return null for collapsed rows. */
        renderRowDetail: (row: T) => ReactNode;
      }
  );

/** A data row paired with its stable id. */
export interface TableRow<T> {
  row: T;
  id: string;
}

/** Ref map from column key to its header cell, shared across the resize/reorder hooks. */
export interface HeaderCellRefs {
  current: Record<string, HTMLTableCellElement | null>;
}
