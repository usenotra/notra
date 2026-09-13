"use client";

import { parseAsInteger, useQueryState } from "nuqs";
import { useCallback, useEffect } from "react";

import { TABLE_PAGE_SIZE } from "@/constants/table";
import type {
  TablePaginationState,
  UseTablePaginationOptions,
} from "@/types/table";
import { pageRowCount } from "@/utils/table";

export function useTablePagination({
  key,
  totalItems,
  pageSize = TABLE_PAGE_SIZE,
  isReady = true,
}: UseTablePaginationOptions): TablePaginationState {
  const [rawPage, setRawPage] = useQueryState(
    key,
    parseAsInteger.withDefault(1).withOptions({ clearOnDefault: true })
  );
  const pageCount = Math.max(1, Math.ceil(totalItems / pageSize));
  const page = Math.min(Math.max(1, rawPage), pageCount);

  useEffect(() => {
    if (isReady && rawPage !== page) {
      setRawPage(page, { history: "replace" });
    }
  }, [isReady, page, rawPage, setRawPage]);

  const setPage = useCallback(
    (next: number) => {
      const count = Math.max(1, Math.ceil(totalItems / pageSize));
      setRawPage(Math.min(Math.max(1, next), count));
    },
    [pageSize, setRawPage, totalItems]
  );

  return {
    page,
    pageCount,
    pageSize,
    totalItems,
    pageRowCount: pageRowCount(page, pageSize, totalItems),
    setPage,
  };
}
