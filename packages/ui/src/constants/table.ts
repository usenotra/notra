import type { CSSProperties } from "react";

/** Grey shell around every table: 1px outer border plus a 2px rim on all sides. */
export const TABLE_FRAME_CLASS =
  "rounded-2xl border border-shell-border bg-shell p-0.5";

/** The lifted white card inside the shell that holds the rows. */
export const TABLE_BODY_CLASS =
  "rounded-[14px] border border-border bg-background shadow-lift";

/**
 * Dualtone chrome for a single `<table>`: the header sits on the grey shell,
 * the body cells form the lifted white card. `border-separate` is required
 * because row borders and radii only render on cells in that model.
 */
export const TABLE_CARD_CELLS_CLASS = [
  "[&>tbody>tr>td]:bg-background [&>tbody>tr>td]:border-border/60 [&>tbody>tr>td]:border-b [&>tbody>tr>td]:transition-colors",
  "[&>tbody>tr:hover>td]:bg-[color-mix(in_oklab,var(--muted)_50%,var(--background))]",
  "[&>tbody>tr:first-child>td]:border-t-border [&>tbody>tr:first-child>td]:border-t",
  "[&>tbody>tr:last-child>td]:border-b-border",
  "[&>tbody>tr>td:first-child]:border-l-border [&>tbody>tr>td:first-child]:border-l",
  "[&>tbody>tr>td:last-child]:border-r-border [&>tbody>tr>td:last-child]:border-r",
  "[&>tbody>tr:first-child>td:first-child]:rounded-tl-[14px] [&>tbody>tr:first-child>td:last-child]:rounded-tr-[14px]",
  "[&>tbody>tr:last-child>td:first-child]:rounded-bl-[14px] [&>tbody>tr:last-child>td:last-child]:rounded-br-[14px]",
].join(" ");

/** Radius of the white card, so header/footer bands can match it. */
export const TABLE_INNER_RADIUS_CLASS = "rounded-[14px]";

/** Row separator inside the white card. */
export const TABLE_ROW_BORDER_CLASS = "border-border/60 border-b";

/** Inner box for table cells. Gives children a real used width so truncate /
 * max-width:100% resolve against the column, not the td's max-w-0 hack. */
export const TABLE_CELL_INNER_CLASS =
  "w-full min-w-0 truncate [&>*]:min-w-0 [&>*]:max-w-full";

export const CHECKBOX_COLUMN_WIDTH = "3rem";

/**
 * Width the frame takes from the rows: shell border + 2px rim + body border,
 * on both sides. Add it to any outer width that has to fit a framed table.
 */
export const TABLE_FRAME_INSET = "8px";
/** `TABLE_FRAME_INSET` as a number, for heights measured in px. */
export const TABLE_FRAME_INSET_PX = 8;

/** Horizontal padding of header labels (`px-4` on both sides). */
export const HEADER_PAD_X_PX = 32;
/** Sort arrow: 14px icon + 4px `gap-1`. */
export const SORT_ICON_PX = 18;
/** Info icon plus its gap, so a hint never squeezes the header label. */
export const HINT_ICON_PX = 18;
/** Default resize/layout floor, used as the tables' `minColumnWidth`. */
export const DEFAULT_MIN_COLUMN_WIDTH = 64;
/** Extra `ch` so wide glyphs (M, W) are not clipped vs the `0`-width `ch` unit. */
export const HEADER_CH_BUFFER = 1;

export const DATA_TABLE_ROW_HEIGHT = 48;
export const DATA_TABLE_HEIGHT = 440;
export const DATA_TABLE_OVERSCAN = 10;
export const DATA_TABLE_SKELETON_ROWS = 3;
/** Distance from the bottom, in rows, at which an infinite table asks for more. */
export const INFINITE_TABLE_END_THRESHOLD_ROWS = 4;

export const TABLE_SKELETON_COLUMN_WIDTHS = ["1fr", "1fr", "8rem", "6rem"];
export const TABLE_SKELETON_ROW_COUNT = 5;
export const TABLE_SKELETON_ROW_HEIGHT = 52;

/** Page sizes the table footer offers by default. */
export const TABLE_PAGE_SIZE_OPTIONS = [10, 20, 30, 40, 50] as const;

/** Sideways overflow below this many px is rounding, not columns that don't fit. */
export const HORIZONTAL_OVERFLOW_TOLERANCE_PX = 2;

/** Outer radius of the white card (`rounded-[14px]`). */
export const TABLE_BODY_RADIUS_PX = 14;
/** Corner scrollbar: gap between the card's outer edge and the thumb. */
export const CORNER_SCROLLBAR_GAP_PX = 3;
/** Corner scrollbar thumb width. */
export const CORNER_SCROLLBAR_WIDTH_PX = 4;
/** Shell border (1px) plus rim (2px) between the shell edge and the body card. */
export const TABLE_SHELL_INSET_PX = 3;
/** Shortest thumb, so a long table still has something to grab. */
export const CORNER_SCROLLBAR_MIN_THUMB_PX = 28;
/** How long the thumb stays visible after the last scroll event. */
export const CORNER_SCROLLBAR_IDLE_MS = 900;

/**
 * Corner-morph geometry as CSS variables, set on the table frame so both the
 * shell and the body read them. The tightened card radius is concentric with
 * the thumb's round end; the shell's adds its own inset on top.
 */
export const CORNER_SCROLLBAR_VARS = {
  "--corner-scrollbar-gap": `${CORNER_SCROLLBAR_GAP_PX}px`,
  "--corner-scrollbar-width": `${CORNER_SCROLLBAR_WIDTH_PX}px`,
  "--corner-card-radius": `${CORNER_SCROLLBAR_GAP_PX + CORNER_SCROLLBAR_WIDTH_PX / 2}px`,
  "--corner-shell-radius": `${CORNER_SCROLLBAR_GAP_PX + CORNER_SCROLLBAR_WIDTH_PX / 2 + TABLE_SHELL_INSET_PX}px`,
} as CSSProperties;
