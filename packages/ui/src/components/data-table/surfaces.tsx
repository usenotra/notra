import {
  TABLE_BODY_CLASS,
  TABLE_FRAME_CLASS,
} from "@notra/ui/constants/table";
import { cn } from "@notra/ui/lib/utils";
import type {
  TableBodySurfaceProps,
  TableFrameProps,
  TableFooterSurfaceProps,
  TableHeaderSurfaceProps,
  TableScrollFadeProps,
} from "@notra/ui/types/data-table";

/** Grey shell that wraps header, body and footer with a 2px rim. */
export function TableFrame({
  flushTop,
  flushBottom,
  children,
}: TableFrameProps) {
  return (
    <div
      className={cn(
        TABLE_FRAME_CLASS,
        flushTop && "rounded-t-none border-t-0 pt-0",
        flushBottom && "rounded-b-none border-b-0 pb-0"
      )}
    >
      {children}
    </div>
  );
}

export function TableHeaderSurface({
  toolbar,
  flushTop,
  overlapTop,
  children,
}: TableHeaderSurfaceProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-t-[14px] pb-5",
        flushTop && "rounded-t-none",
        overlapTop && "pt-5"
      )}
    >
      {toolbar ? (
        <div className="border-border bg-background rounded-t-[14px] border-b">
          {toolbar}
        </div>
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

export function TableBodySurface({
  isEmpty,
  overflowClass,
  flushBottom,
  hasFooter,
  dimRows,
  loadingState,
  onScroll,
  scrollRef,
  style,
  children,
}: TableBodySurfaceProps) {
  return (
    <div
      className={cn(
        "scrollbar-floating relative -mt-5 box-content outline-none",
        TABLE_BODY_CLASS,
        isEmpty ? "overflow-hidden" : overflowClass,
        flushBottom && !hasFooter && "rounded-b-none border-b-0",
        dimRows &&
          "pointer-events-none opacity-60 transition-opacity duration-200 motion-reduce:transition-none"
      )}
      data-loading={loadingState}
      inert={dimRows ? true : undefined}
      onScroll={onScroll}
      ref={scrollRef}
      style={style}
    >
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
        "-mt-5 rounded-b-[14px] pt-5",
        flushBottom && "rounded-b-none"
      )}
    >
      {footer}
    </div>
  );
}
