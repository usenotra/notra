"use client";

import { createContext, type ReactNode, useContext, useMemo } from "react";

import { DATA_TABLE_LABELS } from "../constants/data-table";
import type { DataTableLabels } from "../types/data-table";

const DataTableLabelsContext =
  createContext<DataTableLabels>(DATA_TABLE_LABELS);

export function DataTableLabelsProvider({
  labels,
  children,
}: {
  labels?: Partial<DataTableLabels>;
  children: ReactNode;
}) {
  const value = useMemo(() => ({ ...DATA_TABLE_LABELS, ...labels }), [labels]);
  return (
    <DataTableLabelsContext.Provider value={value}>
      {children}
    </DataTableLabelsContext.Provider>
  );
}

export function useDataTableLabels(): DataTableLabels {
  return useContext(DataTableLabelsContext);
}
