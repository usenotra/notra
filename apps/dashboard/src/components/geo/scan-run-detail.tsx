"use client";

import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Loading03Icon,
  Clock01Icon,
  MinusSignIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { GEO_SCAN_RESULTS_PAGE_SIZE } from "@notra/geo-core/constants/geo-scan-history";
import { useState } from "react";

import { Button } from "@/components/button";
import { EngineIcon } from "@/components/geo/engine-icon";
import { ScanAnswerSheet } from "@/components/geo/scan-answer-sheet";
import { ScanResultsList } from "@/components/geo/scan-results-list";
import { ScanRunSummary } from "@/components/geo/scan-run-summary";
import { useGeoScanRun } from "@/lib/hooks/use-geo-scan-history";
import type {
  GeoScanResultsProps,
  GeoScanRunDetailProps,
} from "@/types/geo-scan-activity";
import { formatEngineWithMode } from "@/utils/geo-charts";

function ScanResults({
  onPendingPageChange,
  query,
  running,
  onSelect,
  footer,
}: GeoScanResultsProps) {
  if (query.isError && !query.data) {
    return (
      <div className="space-y-2 py-4">
        <p className="text-sm" role="alert">
          Could not load scan results.
        </p>
        <Button
          onClick={() => {
            void query.refetch();
          }}
          size="sm"
          variant="outline"
        >
          Try again
        </Button>
      </div>
    );
  }
  if (query.isPending) {
    return (
      <p
        className="text-muted-foreground py-6 text-center text-sm"
        role="status"
      >
        Loading results…
      </p>
    );
  }
  if (!query.data) {
    return (
      <p className="text-muted-foreground py-6 text-center text-sm">
        This scan is no longer available.
      </p>
    );
  }
  if (query.data.results.length === 0 && query.data.pending.length === 0) {
    return (
      <p
        className="text-muted-foreground py-6 text-center text-sm"
        role="status"
      >
        {running
          ? "Waiting for the first answers. Results appear as each batch finishes."
          : "No saved answers for this selection."}
      </p>
    );
  }
  return (
    <>
      {query.data.pending.length > 0 ? (
        <ul className="divide-y rounded-lg" aria-label="Pending scan answers">
          {query.data.pending.map((task) => (
            <li key={task.key} className="flex items-start gap-3 p-4">
              <HugeiconsIcon
                aria-hidden="true"
                className={
                  task.status === "running"
                    ? "text-primary mt-0.5 shrink-0 motion-safe:animate-spin"
                    : "text-muted-foreground mt-0.5 shrink-0"
                }
                icon={
                  (task.status === "running" && Loading03Icon) ||
                  (task.status === "queued" && Clock01Icon) ||
                  MinusSignIcon
                }
                size={16}
              />
              <div className="min-w-0 space-y-2">
                <p className="text-sm font-medium break-words">{task.prompt}</p>
                <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
                  <span className="inline-flex items-center gap-1.5">
                    <EngineIcon className="size-3.5" engine={task.engine} />
                    {formatEngineWithMode(task.engine)}
                  </span>
                  <span>{task.language}</span>
                  <span>
                    {task.status === "running" ? "Generating answer…" : null}
                    {task.status === "queued" ? "Queued" : null}
                    {task.status === "failed" ? "No answer saved" : null}
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
      {query.data.pendingTotal > GEO_SCAN_RESULTS_PAGE_SIZE ? (
        <nav
          aria-label="Pending answers pages"
          className="text-muted-foreground flex items-center justify-end gap-2 px-3 py-2 text-xs"
        >
          <Button
            aria-label="Previous pending answers"
            disabled={query.data.pendingOffset === 0 || query.isPlaceholderData}
            onClick={() =>
              onPendingPageChange(
                Math.max(
                  0,
                  (query.data?.pendingOffset ?? 0) - GEO_SCAN_RESULTS_PAGE_SIZE
                )
              )
            }
            size="icon-sm"
            variant="outline"
          >
            <HugeiconsIcon
              aria-hidden="true"
              icon={ArrowLeft01Icon}
              size={14}
            />
          </Button>
          <span className="tabular-nums" aria-live="polite">
            Pending{" "}
            {Math.floor(query.data.pendingOffset / GEO_SCAN_RESULTS_PAGE_SIZE) +
              1}{" "}
            of {Math.ceil(query.data.pendingTotal / GEO_SCAN_RESULTS_PAGE_SIZE)}
          </span>
          <Button
            aria-label="Next pending answers"
            disabled={
              query.data.pendingOffset + GEO_SCAN_RESULTS_PAGE_SIZE >=
                query.data.pendingTotal || query.isPlaceholderData
            }
            onClick={() =>
              onPendingPageChange(
                (query.data?.pendingOffset ?? 0) + GEO_SCAN_RESULTS_PAGE_SIZE
              )
            }
            size="icon-sm"
            variant="outline"
          >
            <HugeiconsIcon
              aria-hidden="true"
              icon={ArrowRight01Icon}
              size={14}
            />
          </Button>
        </nav>
      ) : null}
      <ScanResultsList
        footer={footer}
        onSelect={onSelect}
        results={query.data.results}
      />
    </>
  );
}

export function ScanRunDetail({ organizationId, run }: GeoScanRunDetailProps) {
  const [pendingOffset, setPendingOffset] = useState(0);
  const [offset, setOffset] = useState(0);
  const [engine, setEngine] = useState("");
  const [checkId, setCheckId] = useState<string | null>(null);
  const query = useGeoScanRun(
    organizationId,
    run.id,
    offset,
    engine || undefined,
    pendingOffset
  );
  const data = query.data;
  const running = run.status === "running";

  return (
    <div className="space-y-3">
      <ScanRunSummary run={run} updatedAt={query.dataUpdatedAt} />
      {run.plan && run.plan.engines.length > 1 ? (
        <div className="flex justify-end">
          <select
            aria-label="Filter scan results by model"
            className="bg-background focus-visible:ring-ring h-8 max-w-full rounded-lg border px-2 text-xs focus-visible:ring-2"
            onChange={(event) => {
              setEngine(event.target.value);
              setOffset(0);
              setPendingOffset(0);
            }}
            value={engine}
          >
            <option value="">All models</option>
            {run.plan.engines.map((item) => (
              <option key={item} value={item}>
                {formatEngineWithMode(item)}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      <div aria-busy={query.isPlaceholderData} className="min-w-0">
        <ScanResults
          onPendingPageChange={setPendingOffset}
          onSelect={setCheckId}
          query={query}
          running={running}
          footer={
            data && data.total > GEO_SCAN_RESULTS_PAGE_SIZE ? (
              <div className="text-muted-foreground flex items-center justify-end px-3 py-2 text-xs">
                <div className="flex items-center gap-2">
                  <Button
                    aria-label="Previous results"
                    disabled={offset === 0 || query.isPlaceholderData}
                    onClick={() =>
                      setOffset((current) =>
                        Math.max(0, current - GEO_SCAN_RESULTS_PAGE_SIZE)
                      )
                    }
                    size="icon-sm"
                    variant="outline"
                  >
                    <HugeiconsIcon
                      aria-hidden="true"
                      icon={ArrowLeft01Icon}
                      size={14}
                    />
                  </Button>
                  <span
                    className="min-w-24 text-center tabular-nums"
                    aria-live="polite"
                  >
                    Page {Math.floor(offset / GEO_SCAN_RESULTS_PAGE_SIZE) + 1}{" "}
                    of{" "}
                    {Math.max(
                      1,
                      Math.ceil(data.total / GEO_SCAN_RESULTS_PAGE_SIZE)
                    )}
                  </span>
                  <Button
                    aria-label="Next results"
                    disabled={
                      offset + GEO_SCAN_RESULTS_PAGE_SIZE >= data.total ||
                      query.isPlaceholderData
                    }
                    onClick={() =>
                      setOffset(
                        (current) => current + GEO_SCAN_RESULTS_PAGE_SIZE
                      )
                    }
                    size="icon-sm"
                    variant="outline"
                  >
                    <HugeiconsIcon
                      aria-hidden="true"
                      icon={ArrowRight01Icon}
                      size={14}
                    />
                  </Button>
                </div>
              </div>
            ) : null
          }
        />
      </div>
      <ScanAnswerSheet
        scanId={run.id}
        initialLanguage={
          data?.results.find((result) => result.id === checkId)?.language
        }
        checkId={checkId}
        onClose={() => setCheckId(null)}
        organizationId={organizationId}
      />
    </div>
  );
}
