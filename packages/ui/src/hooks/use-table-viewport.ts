import { useVirtualizer } from "@tanstack/react-virtual";

import { INFINITE_TABLE_END_THRESHOLD_ROWS } from "@notra/ui/constants/table";
import { useCallback, useEffect, useRef, useState } from "react";

import type { UseTableViewportOptions } from "@notra/ui/types/data-table";
import { getTableViewportLayout } from "@notra/ui/lib/data-table";

export function useTableViewport<T>({
  rows,
  rowHeight,
  rowSizing,
  height,
  minHeight,
  autoHeight,
  overscan,
  loading,
  onEndReached,
}: UseTableViewportOptions<T>) {
  "use no memo";
  const scrollRef = useRef<HTMLDivElement>(null);
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const endReachedRef = useRef(false);
  const [horizontalScrollbarHeight, setHorizontalScrollbarHeight] = useState(0);

  const virtualizer = useVirtualizer({
    enabled: rowSizing === "fixed",
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => rowHeight,
    initialRect: { height, width: 0 },
    overscan,
  });
  const layout = getTableViewportLayout({
    rowCount: rows.length,
    rowHeight,
    rowSizing,
    height,
    minHeight,
    autoHeight,
    horizontalScrollbarHeight,
  });
  const virtualItems = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();
  const paddingTop = virtualItems[0]?.start ?? 0;
  const lastVirtualItem = virtualItems.at(-1);
  const paddingBottom = lastVirtualItem ? totalSize - lastVirtualItem.end : 0;
  const renderedRows = layout.scrolls
    ? virtualItems.flatMap((item) => {
        const entry = rows[item.index];
        return entry ? [{ entry, index: item.index }] : [];
      })
    : rows.map((entry, index) => ({ entry, index }));

  // Allow another near-bottom notification after the current load completes.
  useEffect(() => {
    if (!loading) {
      endReachedRef.current = false;
    }
  }, [loading]);

  // And once the row count changes (client-side infinite scroll).
  useEffect(() => {
    endReachedRef.current = false;
  }, [rows.length]);

  const [atEnd, setAtEnd] = useState(true);

  // Asks for the next page once the reader is near the bottom. Also runs when
  // the rows or the viewport change, so a first page too short to scroll
  // still loads the rest.
  const requestMoreIfNearEnd = useCallback(
    (element: HTMLDivElement) => {
      if (!onEndReached || loading || endReachedRef.current) {
        return;
      }
      if (
        element.scrollHeight - element.scrollTop - element.clientHeight <
        rowHeight * INFINITE_TABLE_END_THRESHOLD_ROWS
      ) {
        endReachedRef.current = true;
        onEndReached();
      }
    },
    [onEndReached, loading, rowHeight]
  );

  const handleScroll = useCallback(() => {
    const element = scrollRef.current;
    if (!element) {
      return;
    }
    if (headerScrollRef.current) {
      headerScrollRef.current.scrollLeft = element.scrollLeft;
    }
    setAtEnd(
      element.scrollTop + element.clientHeight + 1 >= element.scrollHeight
    );
    requestMoreIfNearEnd(element);
  }, [requestMoreIfNearEnd]);

  // Keep the end fade in sync when content or viewport size changes without a
  // scroll event (initial render, rows appended, container resized).
  useEffect(() => {
    const element = scrollRef.current;
    if (!element) {
      return;
    }
    const measure = () => {
      setAtEnd(
        element.scrollTop + element.clientHeight + 1 >= element.scrollHeight
      );
      requestMoreIfNearEnd(element);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [rows.length, requestMoreIfNearEnd]);

  // Classic horizontal scrollbars consume height; compensate to avoid clipping a row.
  useEffect(() => {
    const element = scrollRef.current;
    if (!element) {
      return;
    }
    const measure = () => {
      const styles = getComputedStyle(element);
      const borders =
        Number.parseFloat(styles.borderTopWidth) +
        Number.parseFloat(styles.borderBottomWidth);
      setHorizontalScrollbarHeight(
        Math.max(0, element.offsetHeight - element.clientHeight - borders)
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);


  return {
    ...layout,
    scrollRef,
    headerScrollRef,
    handleScroll,
    renderedRows,
    paddingTop,
    paddingBottom,
    atEnd,
  };
}
