"use client";

import { Table } from "@/components/motion/table";
import { TABLE_ROW_HEIGHT } from "@/constants/table";
import { tableHeightFor } from "@/utils/table";

import { columns } from "./columns";

const LOGS_SKELETON_ROW_COUNT = 10;

export function LogsPageSkeleton() {
  return (
    <Table
      className="rounded-2xl"
      columns={columns}
      data={[]}
      height={tableHeightFor(LOGS_SKELETON_ROW_COUNT, TABLE_ROW_HEIGHT)}
      loading
      rowHeight={TABLE_ROW_HEIGHT}
    />
  );
}
