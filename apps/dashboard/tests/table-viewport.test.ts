import { describe, expect, test } from "bun:test";

import { getTableViewportLayout } from "@/utils/table-viewport";

describe("table viewport layout", () => {
  test("small fixed lists shrink to their rows and account for the horizontal scrollbar", () => {
    const layout = getTableViewportLayout({
      rowCount: 2,
      rowHeight: 52,
      rowSizing: "fixed",
      height: 420,
      horizontalScrollbarHeight: 12,
    });
    expect(layout.scrolls).toBe(false);
    expect(layout.bodyStyle.height).toBe(116);
    expect(layout.headerStyle).toBeUndefined();
  });

  test("large fixed lists end on a complete row and reserve matching scroll gutters", () => {
    const layout = getTableViewportLayout({
      rowCount: 100,
      rowHeight: 52,
      rowSizing: "fixed",
      height: 420,
      horizontalScrollbarHeight: 0,
    });
    expect(layout.scrolls).toBe(true);
    expect(layout.bodyHeight).toBe(364);
    expect(layout.bodyStyle.height).toBe(364);
    expect(layout.bodyStyle.scrollbarGutter).toBe("stable");
    expect(layout.headerStyle?.scrollbarGutter).toBe("stable");
  });

  test("multiline lists use a height cap instead of a fixed height or virtual rows", () => {
    const layout = getTableViewportLayout({
      rowCount: 100,
      rowHeight: 52,
      rowSizing: "content",
      height: 420,
      horizontalScrollbarHeight: 12,
    });
    expect(layout.scrolls).toBe(false);
    expect(layout.bodyStyle.height).toBeUndefined();
    expect(layout.bodyStyle.maxHeight).toBe(376);
    expect(layout.overflowClass).toBe("overflow-auto");
  });

  test("minimum height keeps a small table open without clipping its empty state", () => {
    const layout = getTableViewportLayout({
      rowCount: 0,
      rowHeight: 52,
      rowSizing: "content",
      height: 104,
      minHeight: 208,
      horizontalScrollbarHeight: 0,
    });
    expect(layout.bodyHeight).toBe(156);
    expect(layout.bodyStyle.height).toBe(156);
    expect(layout.bodyStyle.maxHeight).toBeUndefined();
  });
});
