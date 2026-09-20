import { useLayoutEffect, useMemo, useRef, useState } from "react";

import type { TableColumn } from "./types";
import { headerMinWidth, isFrWidth } from "./utils";

interface CollapsibleColumnsOptions {
  minColumnWidth: number;
  extraFixedWidths?: readonly string[];
  extraChromePx?: number;
}

/**
 * The width a column actually occupies at its narrowest: fixed widths never
 * shrink below their declared size (see `colWidthStyle`), flexible ones stop
 * at their header floor.
 */
function columnFloorCss<T>(
  column: TableColumn<T>,
  minColumnWidth: number,
  extraChromePx: number
): string {
  const floor = headerMinWidth(column, minColumnWidth, extraChromePx);
  if (!column.width || isFrWidth(column.width)) {
    return floor;
  }
  return `max(${column.width}, ${floor})`;
}

function tableFloorCss<T>(
  columns: readonly TableColumn<T>[],
  minColumnWidth: number,
  extraFixedWidths: readonly string[],
  extraChromePx: number
): string {
  const parts = [
    ...extraFixedWidths,
    ...columns.map((column) =>
      columnFloorCss(column, minColumnWidth, extraChromePx)
    ),
  ];
  return parts.length === 0 ? "0px" : `calc(${parts.join(" + ")})`;
}

function columnSignature<T>(column: TableColumn<T>): string {
  const header = typeof column.header === "string" ? column.header : "";
  return [
    column.key,
    column.width ?? "",
    column.minWidth ?? "",
    header,
    column.sortable ? 1 : 0,
    column.collapsePriority ?? "",
  ].join(":");
}

/**
 * Drops low-priority columns while the container is narrower than the
 * remaining column floors. Floors are CSS lengths (rem, ch, calc), so each
 * candidate set is measured once with a hidden probe; resizing afterwards only
 * compares numbers and re-renders when the hidden set actually changes.
 */
export function useCollapsibleColumns<T>(
  columns: TableColumn<T>[],
  {
    minColumnWidth,
    extraFixedWidths = [],
    extraChromePx = 0,
  }: CollapsibleColumnsOptions
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hiddenCount, setHiddenCount] = useState(0);
  // Columns are usually rebuilt every render; only their floors matter here,
  // so effects key on this signature and read the latest columns from a ref.
  const signature = columns.map(columnSignature).join("|");
  const latest = useRef({ columns, extraFixedWidths, extraChromePx });
  useLayoutEffect(() => {
    latest.current = { columns, extraFixedWidths, extraChromePx };
  });
  const collapseKeys = columns
    .filter((column) => column.collapsePriority !== undefined)
    .sort(
      (left, right) =>
        (right.collapsePriority ?? 0) - (left.collapsePriority ?? 0)
    )
    .map((column) => column.key)
    .join("|");

  useLayoutEffect(() => {
    const container = containerRef.current;
    const collapseOrder = collapseKeys ? collapseKeys.split("|") : [];
    if (!container || collapseOrder.length === 0) {
      setHiddenCount(0);
      return;
    }
    const {
      columns: current,
      extraFixedWidths: fixed,
      extraChromePx: chrome,
    } = latest.current;

    const probe = document.createElement("div");
    probe.style.cssText =
      "position:absolute;visibility:hidden;pointer-events:none;height:0;overflow:hidden;";
    container.append(probe);
    const floors = collapseOrder.map((_, count) => {
      const hidden = new Set(collapseOrder.slice(0, count));
      probe.style.width = tableFloorCss(
        current.filter((column) => !hidden.has(column.key)),
        minColumnWidth,
        fixed,
        chrome
      );
      return probe.offsetWidth;
    });
    probe.remove();

    const update = () => {
      const width = container.clientWidth;
      const fits = floors.findIndex((floor) => floor <= width);
      setHiddenCount(fits === -1 ? collapseOrder.length : fits);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(container);
    return () => observer.disconnect();
  }, [collapseKeys, signature, minColumnWidth]);

  const visibleColumns = useMemo(() => {
    if (hiddenCount === 0) {
      return columns;
    }
    const hidden = new Set(collapseKeys.split("|").slice(0, hiddenCount));
    return columns.filter((column) => !hidden.has(column.key));
  }, [collapseKeys, columns, hiddenCount]);

  return { containerRef, visibleColumns };
}
