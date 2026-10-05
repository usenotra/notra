"use client";

import { TABLE_FRAME_INSET_PX } from "@notra/ui/constants/table";
import { Activity, useLayoutEffect, useRef, useState } from "react";

import { ShelfBoard } from "@/components/geo/shelf/shelf-board";
import { ShelfTable } from "@/components/geo/shelf/shelf-table";
import { GEO_SHELF_TABLE_ROW_HEIGHT } from "@/constants/geo-shelf";
import type { GeoShelfViewProps } from "@/types/geo-shelf";

export function ShelfView({
  view,
  rows,
  totalCount,
  filteredCount,
  boardCounts,
  sort,
  onSortChange,
  hasNextPage,
  isFetching,
  isFetchingNextPage,
  onLoadMore,
  ticketFilter,
  currentMemberId,
  pendingSourceIds,
  hasScanData,
  onAddShelf,
  onRowClick,
  onUpdateOpportunity,
  onSetPlacementStatus,
  competitorCount,
}: GeoShelfViewProps) {
  const showBoard = view === "board" && totalCount > 0;
  const [boardMounted, setBoardMounted] = useState(showBoard);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number>();

  useLayoutEffect(() => {
    const element = viewportRef.current;
    if (!element) {
      return;
    }
    const ancestors: HTMLElement[] = [];
    let parent = element.parentElement;
    while (parent) {
      ancestors.push(parent);
      parent = parent.parentElement;
    }
    const measure = () => {
      let bottom = window.innerHeight;
      let paddingBottom = 0;
      let scrollTop = window.scrollY;
      for (const ancestor of ancestors) {
        const style = getComputedStyle(ancestor);
        paddingBottom += Number.parseFloat(style.paddingBottom) || 0;
        if (["auto", "scroll", "hidden"].includes(style.overflowY)) {
          bottom = Math.min(
            bottom,
            ancestor.getBoundingClientRect().top +
              ancestor.clientTop +
              ancestor.clientHeight
          );
          scrollTop = ancestor.scrollTop;
          break;
        }
      }
      setHeight(
        Math.max(
          GEO_SHELF_TABLE_ROW_HEIGHT * 2 + TABLE_FRAME_INSET_PX,
          Math.floor(
            bottom -
              element.getBoundingClientRect().top -
              scrollTop -
              paddingBottom
          )
        )
      );
    };
    const observer = new ResizeObserver(measure);
    for (const ancestor of ancestors) {
      observer.observe(ancestor);
    }
    measure();
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  if (showBoard && !boardMounted) {
    setBoardMounted(true);
  }

  return (
    <div className="min-h-0 min-w-0 flex-1" ref={viewportRef}>
      <Activity mode={showBoard ? "hidden" : "visible"}>
        <ShelfTable
          competitorCount={competitorCount}
          currentMemberId={currentMemberId}
          filteredCount={filteredCount}
          hasNextPage={hasNextPage}
          hasScanData={hasScanData}
          height={height}
          isFetching={isFetching}
          isFetchingNextPage={isFetchingNextPage}
          onAddShelf={onAddShelf}
          onLoadMore={onLoadMore}
          onRowClick={onRowClick}
          onSetPlacementStatus={onSetPlacementStatus}
          onSortChange={onSortChange}
          onUpdateOpportunity={onUpdateOpportunity}
          pendingSourceIds={pendingSourceIds}
          rows={rows}
          sort={sort}
          totalCount={totalCount}
        />
      </Activity>
      {boardMounted ? (
        <Activity mode={showBoard ? "visible" : "hidden"}>
          <ShelfBoard
            boardCounts={boardCounts}
            currentMemberId={currentMemberId}
            hasNextPage={hasNextPage}
            height={height}
            isFetching={isFetching}
            onLoadMore={onLoadMore}
            onRowClick={onRowClick}
            onUpdateOpportunity={onUpdateOpportunity}
            pendingSourceIds={pendingSourceIds}
            rows={rows}
            ticketFilter={ticketFilter}
          />
        </Activity>
      ) : null}
    </div>
  );
}
