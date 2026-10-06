import { cn } from "cn";

import { TABLE_BODY_CLASS, TABLE_FRAME_CLASS } from "../constants/data-table";
import type {
  TableBodySurfaceProps,
  TableFrameProps,
  TableFooterSurfaceProps,
  TableHeaderSurfaceProps,
  TableScrollFadeProps,
} from "../types/data-table";

/**
 * Grey shell that wraps header, body and footer with a 2px rim. A flush edge
 * joins the shell of the table next to it: the border and radius go, the rim
 * stays, so stacked tables read as one tray with a card per section.
 */
export function TableFrame({
  flushTop,
  flushBottom,
  children,
}: TableFrameProps) {
  return (
    <div
      className={cn(
        TABLE_FRAME_CLASS,
        flushTop && "rounded-t-none border-t-0",
        flushBottom && "rounded-b-none border-b-0"
      )}
    >
      {children}
    </div>
  );
}

export function TableHeaderSurface({
  toolbar,
  flushTop,
  children,
}: TableHeaderSurfaceProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-t-[14px] pb-5",
        flushTop && "rounded-t-none"
      )}
    >
      {toolbar ? <div className={TABLE_BODY_CLASS}>{toolbar}</div> : null}
      {children}
    </div>
  );
}

/**
 * Soft fade over the edge where more rows are hidden: at the bottom until the
 * reader reaches the end, at the top once they scroll away from the start.
 */
export function TableScrollFade({
  scrollFade,
  edge,
  hidden,
}: TableScrollFadeProps) {
  if (!scrollFade) {
    return null;
  }
  return (
    <div
      aria-hidden="true"
      className={cn(
        "from-background pointer-events-none sticky left-0 z-10 h-8 to-transparent transition-opacity duration-200 motion-reduce:transition-none",
        edge === "top"
          ? "top-0 -mb-8 bg-linear-to-b"
          : "bottom-0 -mt-8 bg-linear-to-t",
        hidden ? "opacity-0" : "opacity-100"
      )}
    />
  );
}

export function TableBodySurface({
  isEmpty,
  overflowClass,
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

export function TableFooterSurface({ footer }: TableFooterSurfaceProps) {
  if (!footer) {
    return null;
  }
  return <div className="-mt-5 rounded-b-[14px] pt-5">{footer}</div>;
}
