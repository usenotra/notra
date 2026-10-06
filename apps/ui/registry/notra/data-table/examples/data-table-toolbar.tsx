"use client";

import { cn } from "cn";
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";

import { DataTable, type TableColumn } from "../components/data-table";

interface Change {
  id: string;
  kind: "gained" | "lost" | "improved";
  engine: string;
  prompt: string;
  position: string;
}

interface SummaryGroup {
  label: string;
  up: number;
  down: number;
}

const CHANGES: Change[] = [
  {
    id: "change-1",
    kind: "gained",
    engine: "ChatGPT",
    prompt: "best AI meeting notes app for remote teams",
    position: "#3",
  },
  {
    id: "change-2",
    kind: "lost",
    engine: "Gemini",
    prompt: "alternatives to Quillboard for startups",
    position: "–",
  },
  {
    id: "change-3",
    kind: "improved",
    engine: "Perplexity",
    prompt: "tools that summarize Zoom calls",
    position: "#5 → #2",
  },
  {
    id: "change-4",
    kind: "lost",
    engine: "Claude",
    prompt: "privacy-friendly note taker for EU companies",
    position: "–",
  },
];

const SUMMARY: SummaryGroup[] = [
  { label: "Mentions", up: 1, down: 2 },
  { label: "Position", up: 3, down: 0 },
];

const KIND_LABELS: Record<Change["kind"], string> = {
  gained: "Mention gained",
  lost: "Mention lost",
  improved: "Position up",
};

const columns: TableColumn<Change>[] = [
  {
    key: "kind",
    header: "Change",
    width: "10rem",
    cell: (row) => (
      <span
        className={cn(
          "font-medium",
          row.kind === "lost"
            ? "text-red-600 dark:text-red-400"
            : "text-emerald-600 dark:text-emerald-400"
        )}
      >
        {KIND_LABELS[row.kind]}
      </span>
    ),
  },
  { key: "engine", header: "Engine", width: "8rem", collapsePriority: 1 },
  { key: "prompt", header: "Prompt", width: "2fr" },
  { key: "position", header: "Position", width: "7rem", align: "right" },
];

function SummaryToolbar() {
  return (
    <div className="flex min-h-11 flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2 text-sm">
      {SUMMARY.map((group, index) => (
        <div className="flex items-center gap-4" key={group.label}>
          {index > 0 ? (
            <span aria-hidden="true" className="bg-border h-3 w-px" />
          ) : null}
          <span className="flex items-center gap-2">
            <span className="text-muted-foreground">{group.label}</span>
            {group.up > 0 ? (
              <span className="flex items-center gap-0.5 rounded-md bg-emerald-500/10 px-1.5 text-emerald-700 tabular-nums dark:text-emerald-400">
                <ChevronUpIcon className="size-3.5" />
                {group.up}
              </span>
            ) : null}
            {group.down > 0 ? (
              <span className="flex items-center gap-0.5 rounded-md bg-red-500/10 px-1.5 text-red-700 tabular-nums dark:text-red-400">
                <ChevronDownIcon className="size-3.5" />
                {group.down}
              </span>
            ) : null}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function DataTableToolbarExample() {
  return (
    <div className="w-full max-w-3xl self-start">
      <DataTable
        columns={columns}
        data={CHANGES}
        getRowId={(row) => row.id}
        toolbar={<SummaryToolbar />}
      />
    </div>
  );
}
