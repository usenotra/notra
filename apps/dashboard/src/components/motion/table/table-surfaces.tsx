import { cn } from "@/lib/utils";
import type {
  TableFooterSurfaceProps,
  TableHeaderSurfaceProps,
} from "@/types/table";

export function TableHeaderSurface({
  toolbar,
  flushTop,
  overlapTop,
  children,
}: TableHeaderSurfaceProps) {
  return (
    <div
      className={cn(
        "border-border bg-muted overflow-hidden rounded-t-2xl border border-b-0 pb-5",
        flushTop && "rounded-t-none border-t-0",
        overlapTop && "pt-5"
      )}
    >
      {toolbar ? (
        <div className="border-border bg-background border-b">{toolbar}</div>
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
