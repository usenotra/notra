export interface TablePaginationState {
  page: number;
  pageCount: number;
  pageSize: number;
  totalItems: number;
  pageRowCount: number;
  setPage: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}
