"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";

import { DataTable, type TableColumn } from "../components/data-table";

interface Prompt {
  id: string;
  prompt: string;
  engine: string;
  status: "mentioned" | "missing";
  position: number | null;
}

const ENGINES = ["ChatGPT", "Claude", "Gemini", "Perplexity"] as const;
const TOPICS = [
  "best AI meeting notes app for remote teams",
  "alternatives to Quillboard for startups",
  "privacy-friendly note taker for EU companies",
  "tools that summarize Zoom calls",
  "how to build a team knowledge base",
  "AI notes that integrate with Slack and Linear",
] as const;
const PAGE_SIZE = 10;
const ROW_HEIGHT = 48;
const VISIBLE_ROWS = 10;
/**
 * A full page plus the pager and padding. The preview keeps this height on the
 * short last page, so the docs frame and the page below it don't resize.
 */
const PREVIEW_MIN_HEIGHT = 628;

const PROMPTS: Prompt[] = Array.from({ length: 36 }, (_, index) => {
  const mentioned = index % 3 !== 1;
  return {
    id: `prompt-${index}`,
    prompt: TOPICS[index % TOPICS.length] ?? "",
    engine: ENGINES[index % ENGINES.length] ?? "",
    status: mentioned ? "mentioned" : "missing",
    position: mentioned ? (index % 5) + 1 : null,
  };
});

const columns: TableColumn<Prompt>[] = [
  { key: "prompt", header: "Prompt", sortable: true },
  {
    key: "engine",
    header: "Engine",
    width: "7.5rem",
    sortable: true,
    collapsePriority: 1,
  },
  {
    key: "status",
    header: "Mention",
    width: "9rem",
    cell: (row) =>
      row.status === "mentioned" ? (
        <Badge variant="secondary">Mentioned</Badge>
      ) : (
        <Badge variant="outline">Not mentioned</Badge>
      ),
  },
  {
    key: "position",
    header: "Position",
    width: "7rem",
    align: "right",
    sortable: true,
    hint: "Where the brand first shows up in the answer.",
    sortValue: (row) => row.position ?? Number.POSITIVE_INFINITY,
    cell: (row) => (row.position === null ? "–" : `#${row.position}`),
  },
];

export default function DataTableDemo() {
  const [page, setPage] = useState(1);

  return (
    <div
      className="w-full max-w-4xl self-start p-6"
      style={{ minHeight: PREVIEW_MIN_HEIGHT }}
    >
      <DataTable
        columns={columns}
        data={PROMPTS}
        getRowId={(row) => row.id}
        height={(VISIBLE_ROWS + 1) * ROW_HEIGHT}
        pagination={{
          page,
          pageSize: PAGE_SIZE,
          onPageChange: setPage,
          itemLabel: "prompts",
        }}
        rowHeight={ROW_HEIGHT}
        selectable
      />
    </div>
  );
}
