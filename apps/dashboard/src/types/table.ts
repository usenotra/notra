import type { CSSProperties, ReactNode, RefObject } from "react";

import type {
  TableColumn,
  TableProps,
  TableRow,
} from "@/components/motion/table/types";

export interface TablePaginationState {
  page: number;
  pageCount: number;
  pageSize: number;
  totalItems: number;
  pageRowCount: number;
  setPage: (page: number) => void;
}

export interface TableSkeletonProps {
  columnWidths?: readonly string[];
  rows?: number;
  rowHeight?: number;
  className?: string;
}

export interface TableHeaderSurfaceProps extends Pick<
  TableProps<unknown>,
  "toolbar" | "flushTop" | "overlapTop"
> {
  children: ReactNode;
}

export type TableFooterSurfaceProps = Pick<
  TableProps<unknown>,
  "footer" | "flushBottom"
>;

export interface TableScrollFadeProps extends Pick<
  TableProps<unknown>,
  "scrollFade"
> {
  atEnd: boolean;
}

export interface TableColumnGroupProps<T> {
  columns: TableColumn<T>[];
  widths: Record<string, number>;
  selectable: boolean;
  reorderable: boolean;
  minColumnWidth: number;
}

export interface TableViewportLayoutOptions {
  rowCount: number;
  rowHeight: number;
  rowSizing: NonNullable<TableProps<unknown>["rowSizing"]>;
  height: number;
  minHeight?: number;
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

export interface TableBodyProps<T> extends Pick<
  TableProps<T>,
  | "onRowClick"
  | "isRowClickable"
  | "onRowPointerEnter"
  | "onCellEdit"
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
  reduce: boolean;
  hasRowMenu: boolean;
  onActivate: (id: string, index: number) => void;
  onDeactivate: () => void;
  onToggleRow: (id: string) => void;
  rowRefs: RefObject<Record<string, HTMLTableRowElement | null>>;
}
