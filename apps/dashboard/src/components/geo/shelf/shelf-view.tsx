"use client";

import { TABLE_FRAME_INSET_PX } from "@notra/ui/constants/table";
import { Activity, useLayoutEffect, useRef, useState } from "react";

import { ShelfBoard } from "@/components/geo/shelf/shelf-board";
import { ShelfTable } from "@/components/geo/shelf/shelf-table";
import {
  GEO_SHELF_MIN_VIEWPORT_RATIO,
  GEO_SHELF_TABLE_ROW_HEIGHT,
} from "@/constants/geo-shelf";
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
      let top = 0;
      let bottom = window.innerHeight;
      let paddingBottom = 0;
      let scrollTop = window.scrollY;
      for (const ancestor of ancestors) {
        const style = getComputedStyle(ancestor);
        paddingBottom += Number.parseFloat(style.paddingBottom) || 0;
        if (["auto", "scroll", "hidden"].includes(style.overflowY)) {
          const scrollportTop =
            ancestor.getBoundingClientRect().top + ancestor.clientTop;
          top = Math.max(top, scrollportTop);
          bottom = Math.min(bottom, scrollportTop + ancestor.clientHeight);
          scrollTop = ancestor.scrollTop;
          break;
        }
      }
      const shelfTop = element.getBoundingClientRect().top;
      const minimumHeight =
        GEO_SHELF_TABLE_ROW_HEIGHT * 2 + TABLE_FRAME_INSET_PX;
      const unscrolledSpace = bottom - shelfTop - scrollTop - paddingBottom;
      setHeight(
        Math.max(
          minimumHeight,
          Math.floor((bottom - top) * GEO_SHELF_MIN_VIEWPORT_RATIO),
          unscrolledSpace < minimumHeight
            ? Math.floor(bottom - top - paddingBottom)
            : 0,
          Math.floor(bottom - Math.max(top, shelfTop) - paddingBottom)
        )
      );
    };
    let scrollFrame = 0;
    const onScroll = () => {
      if (!scrollFrame) {
        scrollFrame = requestAnimationFrame(() => {
          scrollFrame = 0;
          measure();
        });
      }
    };
    const observer = new ResizeObserver(measure);
    for (const ancestor of ancestors) {
      observer.observe(ancestor);
      ancestor.addEventListener("scroll", onScroll, { passive: true });
    }
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      observer.disconnect();
      cancelAnimationFrame(scrollFrame);
      for (const ancestor of ancestors) {
        ancestor.removeEventListener("scroll", onScroll);
      }
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", onScroll);
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
