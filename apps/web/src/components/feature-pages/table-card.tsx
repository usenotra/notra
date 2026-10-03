import {
  TableBody,
  TableHeader,
  TableRow,
} from "@notra/ui/components/ui/table";
import { cn } from "@notra/ui/lib/utils";

import {
  DUAL_TONE_TABLE_BODY,
  DUAL_TONE_TABLE_CLASS,
  DUAL_TONE_TABLE_HEADER,
  DUAL_TONE_TABLE_ROOT,
} from "@/constants/landing/dual-tone-table";
import type { FeatureTableCardProps } from "@/types/feature-detail-page";

export function TableCard({
  title,
  meta,
  minWidthClass,
  columns,
  head,
  children,
}: FeatureTableCardProps) {
  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex items-center justify-between px-1">
        <span className="text-foreground text-[0.9375rem] font-semibold">
          {title}
        </span>
        <span className="text-muted-foreground text-sm">{meta}</span>
      </div>
      <div className="w-full overflow-x-auto">
        <div className={cn(DUAL_TONE_TABLE_ROOT, minWidthClass)}>
          <div className={DUAL_TONE_TABLE_HEADER}>
            <table className={DUAL_TONE_TABLE_CLASS}>
              {columns}
              <TableHeader className="bg-muted">
                <TableRow className="hover:bg-transparent">{head}</TableRow>
              </TableHeader>
            </table>
          </div>
          <div className={DUAL_TONE_TABLE_BODY}>
            <table className={DUAL_TONE_TABLE_CLASS}>
              {columns}
              <TableBody>{children}</TableBody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
