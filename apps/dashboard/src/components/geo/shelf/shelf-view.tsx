"use client";

import { Activity, useState } from "react";

import { ShelfBoard } from "@/components/geo/shelf/shelf-board";
import { ShelfTable } from "@/components/geo/shelf/shelf-table";
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
}: GeoShelfViewProps) {
  const showBoard = view === "board" && totalCount > 0;
  const [boardMounted, setBoardMounted] = useState(showBoard);

  if (showBoard && !boardMounted) {
    setBoardMounted(true);
  }

  return (
    <>
      <Activity mode={showBoard ? "hidden" : "visible"}>
        <ShelfTable
          currentMemberId={currentMemberId}
          filteredCount={filteredCount}
          hasNextPage={hasNextPage}
          hasScanData={hasScanData}
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
            onLoadMore={onLoadMore}
            onRowClick={onRowClick}
            onUpdateOpportunity={onUpdateOpportunity}
            pendingSourceIds={pendingSourceIds}
            rows={rows}
            ticketFilter={ticketFilter}
          />
        </Activity>
      ) : null}
    </>
  );
}
