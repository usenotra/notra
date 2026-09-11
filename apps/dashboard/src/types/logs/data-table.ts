import type { TableColumn } from "@/components/motion/table";
import type { SortState } from "@/components/motion/table/types";
import type {
  LogSourceFilter,
  LogStatusFilter,
} from "@/types/webhooks/webhooks";

export interface LogPageOptions {
  source: LogSourceFilter;
  status: LogStatusFilter;
  search: string;
  page: number;
  pageSize: number;
  sort: SortState | null;
}

export interface DataTableEmptyState {
  title: string;
  description?: string;
  actionLabel?: string;
  onActionClick?: () => void;
}

export interface DataTableProps<TData> {
  columns: TableColumn<TData>[];
  data: TData[];
  getRowId?: (row: TData, index: number) => string;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
  emptyState?: DataTableEmptyState;
  onRowClick?: (row: TData) => void;
  sort?: SortState | null;
  onSortChange?: (sort: SortState | null) => void;
  totalCount?: number;
}
