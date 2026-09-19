import { cn } from "@/lib/utils";
import type {
  TableFooterSurfaceProps,
  TableHeaderSurfaceProps,
  TableScrollFadeProps,
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

export function TableScrollFade({ scrollFade, atEnd }: TableScrollFadeProps) {
  if (!scrollFade) {
    return null;
  }
  return (
    <div
      aria-hidden="true"
      className={cn(
        "from-background pointer-events-none sticky bottom-0 left-0 -mt-8 h-8 bg-linear-to-t to-transparent transition-opacity duration-200 motion-reduce:transition-none",
        atEnd ? "opacity-0" : "opacity-100"
      )}
    />
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
