import type {
  TableViewportLayout,
  TableViewportLayoutOptions,
} from "@/types/table";

export function getTableViewportLayout({
  rowCount,
  rowHeight,
  rowSizing,
  height,
  minHeight,
  horizontalScrollbarHeight,
}: TableViewportLayoutOptions): TableViewportLayout {
  const resolvedHeight = Math.max(height, minHeight ?? 0);
  // Fixed viewports end on a whole row so separators meet the bottom border.
  const bodyHeight =
    Math.floor(Math.max(rowHeight, resolvedHeight - rowHeight) / rowHeight) *
    rowHeight;
  const minBodyHeight =
    minHeight == null
      ? 0
      : Math.floor(Math.max(rowHeight, minHeight - rowHeight) / rowHeight) *
        rowHeight;
  const contentHeight = Math.max(
    rowHeight,
    Math.min(bodyHeight, rowCount * rowHeight)
  );
  const contentSized = rowSizing === "content";
  const scrolls = !contentSized && rowCount * rowHeight > bodyHeight;
  const viewportHeight = scrolls
    ? bodyHeight
    : Math.max(rowCount === 0 ? bodyHeight : contentHeight, minBodyHeight);
  const scrollbarGutter = contentSized || scrolls ? "stable" : undefined;

  return {
    bodyHeight,
    scrolls,
    overflowClass:
      scrolls || contentSized
        ? "overflow-auto"
        : "overflow-x-auto overflow-y-hidden",
    headerStyle: scrollbarGutter ? { scrollbarGutter } : undefined,
    bodyStyle:
      contentSized && rowCount > 0
        ? {
            scrollbarGutter,
            maxHeight: bodyHeight + horizontalScrollbarHeight,
            minHeight: minBodyHeight,
          }
        : {
            scrollbarGutter,
            height: viewportHeight + horizontalScrollbarHeight,
          },
  };
}
