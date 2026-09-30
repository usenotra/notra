import { useCallback, useMemo, useState } from "react";

import type { SortState, TableColumn, TableRow } from "./types";
import { readSortValue } from "./utils";

export function useColumnSort<T>({
  rows,
  columns,
  sort: sortProp,
  defaultSort = null,
  onSortChange,
  manualSort = false,
}: {
  rows: TableRow<T>[];
  columns: TableColumn<T>[];
  sort?: SortState | null;
  defaultSort?: SortState | null;
  onSortChange?: (sort: SortState | null) => void;
  manualSort?: boolean;
}) {
  const [internalSort, setInternalSort] = useState<SortState | null>(
    defaultSort
  );
  const sort = sortProp !== undefined ? sortProp : internalSort;

  const commit = useCallback(
    (next: SortState | null) => {
      if (sortProp === undefined) {
        setInternalSort(next);
      }
      onSortChange?.(next);
    },
    [sortProp, onSortChange]
  );

  const toggleSort = useCallback(
    (key: string) => {
      if (!sort || sort.key !== key) {
        commit({ key, direction: "asc" });
      } else if (sort.direction === "asc") {
        commit({ key, direction: "desc" });
      } else {
        commit(null);
      }
    },
    [sort, commit]
  );

  const sortedRows = useMemo(() => {
    if (!sort || manualSort) {
      return rows;
    }
    const column = columns.find((c) => c.key === sort.key);
    if (!column) {
      return rows;
    }
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = readSortValue(a.row, column);
      const bv = readSortValue(b.row, column);
      let cmp: number;
      if (typeof av === "number" && typeof bv === "number") {
        cmp = av - bv;
      } else {
        cmp = String(av).localeCompare(String(bv));
      }
      return sort.direction === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [rows, sort, columns, manualSort]);

  return { sort, sortedRows, toggleSort };
}
