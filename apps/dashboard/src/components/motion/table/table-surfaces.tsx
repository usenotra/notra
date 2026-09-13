import { TABLE_ROW_HEIGHT } from "@/constants/table";
import { cn } from "@/lib/utils";
import type {
  TableFooterSurfaceProps,
  TableHeaderSurfaceProps,
} from "@/types/table";

const STACK_OVERLAP_PX = 20;

export function TableHeaderSurface({
  toolbar,
  leadingHeader,
  flushTop,
  overlapTop,
  children,
}: TableHeaderSurfaceProps) {
  const leadingHeaderHeight =
    TABLE_ROW_HEIGHT + (overlapTop && leadingHeader ? STACK_OVERLAP_PX : 0);

  return (
    <div
      className={cn(
        "border-border bg-muted overflow-hidden rounded-t-2xl border border-b-0 pb-5",
        flushTop && "rounded-t-none border-t-0",
        overlapTop && !leadingHeader && "pt-5"
      )}
    >
      {toolbar ? (
        <div className="border-border bg-background border-b">{toolbar}</div>
      ) : null}
      {leadingHeader ? (
        <div
          className={cn(
            "border-border flex items-center border-b px-4",
            overlapTop && "pt-5"
          )}
          style={{ height: leadingHeaderHeight }}
        >
          {leadingHeader}
        </div>
      ) : null}
      {children}
    </div>
  );
}

export function TableFooterSurface({
  footer,
  flushBottom,
}: TableFooterSurfaceProps) {
  if (!footer) {
    return null;
  }
  return (
    <div
      className={cn(
        "border-border bg-muted -mt-5 rounded-b-2xl border border-t-0 pt-5",
        flushBottom && "rounded-b-none border-b-0"
      )}
    >
      {footer}
    </div>
  );
}
