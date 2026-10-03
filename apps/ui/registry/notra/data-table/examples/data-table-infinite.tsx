"use client";

import { useState } from "react";

import { InfiniteDataTable, type TableColumn } from "../components/data-table";

interface Crawler {
  name: string;
  /** Provider id on models.dev, e.g. `openai` for models.dev/logos/openai.svg. */
  provider: string;
}

interface Visit {
  id: string;
  bot: Crawler;
  path: string;
  status: number;
}

const BOTS: readonly Crawler[] = [
  { name: "GPTBot", provider: "openai" },
  { name: "ClaudeBot", provider: "anthropic" },
  { name: "PerplexityBot", provider: "perplexity" },
  { name: "Googlebot", provider: "google" },
];
const PATHS = [
  "/",
  "/pricing",
  "/blog/ai-notes",
  "/docs",
  "/changelog",
] as const;
const PAGE = 25;
const MAX_ROWS = 200;
const LOAD_DELAY_MS = 600;

const makeVisits = (from: number): Visit[] =>
  Array.from({ length: PAGE }, (_, offset) => {
    const index = from + offset;
    return {
      id: `visit-${index}`,
      bot: BOTS[index % BOTS.length] ?? { name: "", provider: "" },
      path: PATHS[index % PATHS.length] ?? "",
      status: index % 11 === 0 ? 404 : 200,
    };
  });

const columns: TableColumn<Visit>[] = [
  {
    key: "bot",
    header: "Crawler",
    width: "11rem",
    cell: ({ bot }) => (
      <span className="flex items-center gap-2">
        <img
          alt=""
          className="size-4 shrink-0 dark:invert"
          height={16}
          src={`https://models.dev/logos/${bot.provider}.svg`}
          width={16}
        />
        <span className="truncate">{bot.name}</span>
      </span>
    ),
  },
  { key: "path", header: "Page" },
  { key: "status", header: "Status", width: "6rem", align: "right" },
];

export default function DataTableInfiniteExample() {
  const [rows, setRows] = useState(() => makeVisits(0));
  const [loading, setLoading] = useState(false);
  const hasMore = rows.length < MAX_ROWS;

  const loadMore = () => {
    setLoading(true);
    setTimeout(() => {
      setRows((current) => [...current, ...makeVisits(current.length)]);
      setLoading(false);
    }, LOAD_DELAY_MS);
  };

  return (
    <div className="w-full max-w-4xl p-6">
      <InfiniteDataTable
        columns={columns}
        data={rows}
        getRowId={(row) => row.id}
        height={400}
        loading={loading}
        loadingMore={loading}
        onEndReached={hasMore && !loading ? loadMore : undefined}
      />
    </div>
  );
}
