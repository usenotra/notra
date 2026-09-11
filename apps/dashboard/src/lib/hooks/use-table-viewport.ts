import { useVirtualizer } from "@tanstack/react-virtual";
import { useCallback, useEffect, useRef, useState } from "react";

import type { UseTableViewportOptions } from "@/types/table";
import { getTableViewportLayout } from "@/utils/table-viewport";

export function useTableViewport<T>({
  rows,
  rowHeight,
  rowSizing,
  height,
  minHeight,
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

  const handleScroll = useCallback(() => {
    const element = scrollRef.current;
    if (!element) {
      return;
    }
    if (headerScrollRef.current) {
      headerScrollRef.current.scrollLeft = element.scrollLeft;
    }
    if (!onEndReached || loading || endReachedRef.current) {
      return;
    }
    if (
      element.scrollHeight - element.scrollTop - element.clientHeight <
      rowHeight * 4
    ) {
      endReachedRef.current = true;
      onEndReached();
    }
  }, [onEndReached, loading, rowHeight]);

  return {
    ...layout,
    scrollRef,
    headerScrollRef,
    handleScroll,
    renderedRows,
    paddingTop,
    paddingBottom,
  };
}
