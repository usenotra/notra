"use client";

import { DataTable } from "@notra/ui/components/ui/data-table";

import { TABLE_ROW_HEIGHT } from "@/constants/table";
import { tableHeightFor } from "@/utils/table";

import { useLogColumns } from "./columns";

const LOGS_SKELETON_ROW_COUNT = 10;

export function LogsPageSkeleton() {
  const columns = useLogColumns();
  return (
    <DataTable
      columns={columns}
      data={[]}
      height={tableHeightFor(LOGS_SKELETON_ROW_COUNT, TABLE_ROW_HEIGHT)}
      loading
      rowHeight={TABLE_ROW_HEIGHT}
    />
  );
}
