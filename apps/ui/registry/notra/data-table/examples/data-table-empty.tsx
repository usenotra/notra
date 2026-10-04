"use client";

import { BotIcon, PlusIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

import { DataTable, type TableColumn } from "../components/data-table";

interface Visit {
  id: string;
  bot: string;
  path: string;
  status: number;
}

const SAMPLE_VISITS: Visit[] = [
  { id: "visit-1", bot: "GPTBot", path: "/pricing", status: 200 },
  { id: "visit-2", bot: "ClaudeBot", path: "/docs", status: 200 },
  { id: "visit-3", bot: "PerplexityBot", path: "/blog/ai-notes", status: 200 },
  { id: "visit-4", bot: "Googlebot", path: "/changelog", status: 404 },
];
/** Room for the empty state; a table without rows has no height of its own. */
const EMPTY_HEIGHT = 300;
/**
 * The empty table's full height. The preview keeps it once rows arrive and the
 * table shrinks to fit them, so the docs frame and the page below don't move.
 */
const PREVIEW_MIN_HEIGHT = 296;

const columns: TableColumn<Visit>[] = [
  { key: "bot", header: "Crawler", width: "11rem" },
  { key: "path", header: "Page" },
  { key: "status", header: "Status", width: "6rem", align: "right" },
];

export default function DataTableEmptyExample() {
  const [visits, setVisits] = useState<Visit[]>([]);

  return (
    <div
      className="w-full max-w-2xl self-start"
      style={{ minHeight: PREVIEW_MIN_HEIGHT }}
    >
      <DataTable
        columns={columns}
        data={visits}
        emptyState={
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <BotIcon />
              </EmptyMedia>
              <EmptyTitle>No crawler visits yet</EmptyTitle>
              <EmptyDescription>
                Add the tracking snippet to your site and AI crawlers show up
                here as they read your pages.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button onClick={() => setVisits(SAMPLE_VISITS)} size="sm">
                <PlusIcon />
                Add snippet
              </Button>
            </EmptyContent>
          </Empty>
        }
        getRowId={(row) => row.id}
        height={EMPTY_HEIGHT}
      />
    </div>
  );
}
