"use client";

import { MinusSignIcon, Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { GEO_SCAN_RESULTS_PAGE_SIZE } from "@notra/geo-core/constants/geo-scan-history";
import { TablePagination } from "@notra/ui/components/shared/table-pagination";
import { Badge } from "@notra/ui/components/ui/badge";
import { useState } from "react";

import { DesignSystemFrame } from "@/components/design-system/design-system-frame";
import { EngineIcon } from "@/components/geo/engine-icon";
import { ScanRunFilters } from "@/components/geo/scan-run-detail";
import { Table, type TableColumn } from "@/components/motion/table";
import {
  DESIGN_SYSTEM_SCAN_ANSWERS,
  DESIGN_SYSTEM_SCAN_MISSING,
  DESIGN_SYSTEM_SCAN_MODELS,
} from "@/constants/design-system-scans";
import { TABLE_ROW_HEIGHT } from "@/constants/table";
import { formatEngineFamily } from "@/utils/geo-charts";
import { paginatedTableHeightFor } from "@/utils/table";

const commonColumns: TableColumn<
  (typeof DESIGN_SYSTEM_SCAN_ANSWERS)[number]
>[] = [
  {
    key: "prompt",
    header: "Prompt",
    width: "1fr",
    minWidth: "14rem",
    cell: (row) => <span className="truncate font-medium">{row.prompt}</span>,
  },
  {
    key: "engine",
    header: "Model",
    width: "12.5rem",
    cell: (row) => (
      <span className="flex items-center gap-2">
        <EngineIcon className="size-3.5" engine={row.engine} />
        {formatEngineFamily(row.engine)}
      </span>
    ),
  },
  {
    key: "language",
    header: "Language",
    width: "7rem",
    cell: (row) => (
      <span className="text-muted-foreground">{row.language}</span>
    ),
  },
];

const answerColumns: TableColumn<
  (typeof DESIGN_SYSTEM_SCAN_ANSWERS)[number]
>[] = [
  ...commonColumns,
  {
    key: "mention",
    header: "Mention",
    width: "9.5rem",
    cell: (row) => (
      <Badge variant={row.mentioned ? "success" : "secondary"}>
        <HugeiconsIcon
          aria-hidden="true"
          icon={row.mentioned ? Tick02Icon : MinusSignIcon}
        />
        {row.mentioned ? "Mentioned" : "Not mentioned"}
      </Badge>
    ),
  },
  {
    key: "position",
    header: "Position",
    width: "6rem",
    align: "right",
    cell: (row) => (
      <span className="text-muted-foreground">
        {row.position === null ? "–" : `#${row.position}`}
      </span>
    ),
  },
  {
    key: "sources",
    header: "Sources",
    width: "6rem",
    align: "right",
    cell: (row) => <span className="text-muted-foreground">{row.sources}</span>,
  },
];

const missingColumns: TableColumn<
  (typeof DESIGN_SYSTEM_SCAN_MISSING)[number]
>[] = [
  ...commonColumns,
  {
    key: "status",
    header: "Status",
    width: "12rem",
    cell: () => <span className="text-muted-foreground">No answer saved</span>,
  },
];

export default function ScanFiltersDesignSystemClientPage() {
  const [view, setView] = useState<"answers" | "pending">("answers");
  const [engine, setEngine] = useState("");
  const [page, setPage] = useState(1);
  const answers = DESIGN_SYSTEM_SCAN_ANSWERS.filter(
    (row) => !engine || row.engine === engine
  );
  const missing = DESIGN_SYSTEM_SCAN_MISSING.filter(
    (row) => !engine || row.engine === engine
  );
  const rows = view === "answers" ? answers : missing;
  const pageCount = Math.max(
    1,
    Math.ceil(rows.length / GEO_SCAN_RESULTS_PAGE_SIZE)
  );
  const pageRows = rows.slice(
    (page - 1) * GEO_SCAN_RESULTS_PAGE_SIZE,
    page * GEO_SCAN_RESULTS_PAGE_SIZE
  );

  return (
    <DesignSystemFrame
      description="Try the Scans table with sample data. Choose Answers or Missing, filter by model, and paginate the results."
      title="Scans table"
    >
      <section className="space-y-3">
        <div>
          <h2 className="text-base font-medium">Scans</h2>
          <p className="text-muted-foreground text-sm">
            Answers from the last scan · sample data
          </p>
        </div>
        <Table
          className="rounded-2xl"
          columns={view === "answers" ? answerColumns : missingColumns}
          data={pageRows}
          emptyState="No results for this model."
          footer={
            <TablePagination
              itemLabel={view === "answers" ? "answers" : "missing"}
              page={page}
              pageCount={pageCount}
              pageRowCount={pageRows.length}
              pageSize={GEO_SCAN_RESULTS_PAGE_SIZE}
              setPage={setPage}
              totalItems={rows.length}
            />
          }
          getRowId={(row) => row.id}
          height={paginatedTableHeightFor(pageRows.length)}
          rowHeight={TABLE_ROW_HEIGHT}
          toolbar={
            <ScanRunFilters
              answerCount={answers.length}
              engine={engine}
              engines={[...DESIGN_SYSTEM_SCAN_MODELS]}
              onEngineChange={(next) => {
                setEngine(next);
                setPage(1);
              }}
              onViewChange={(next) => {
                setView(next);
                setPage(1);
              }}
              pendingCount={missing.length}
              running={false}
              view={view}
            />
          }
        />
      </section>
    </DesignSystemFrame>
  );
}
