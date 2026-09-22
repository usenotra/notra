"use client";

import { Skeleton } from "@notra/ui/components/ui/skeleton";

import { cn } from "@/lib/utils";

import type { TableColumn } from "./types";
import { alignText } from "./utils";

export function SkeletonRows<T>({
  count,
  columns,
  selectable,
  rowHeight,
}: {
  count: number;
  columns: TableColumn<T>[];
  selectable: boolean;
  rowHeight: number;
}) {
  return (
    <>
      {Array.from({ length: count }, (_, r) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder rows
        <tr
          className="border-border/60 border-b"
          key={r}
          style={{ height: rowHeight }}
        >
          {selectable ? <td /> : null}
          {columns.map((column) => (
            <td
              className={cn("px-4", alignText(column.align))}
              key={column.key}
            >
              <Skeleton
                className={cn(
                  "h-3 rounded-full",
                  column.align === "right" ? "ml-auto w-10" : "w-2/3"
                )}
              />
            </td>
          ))}
          <td aria-hidden />
        </tr>
      ))}
    </>
  );
}
