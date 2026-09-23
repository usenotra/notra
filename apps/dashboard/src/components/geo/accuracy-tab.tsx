"use client";

import { GEO_WRITER_NAV_LINK } from "@notra/geo-core/constants/geo";
import { formatDayLabel } from "@notra/geo-core/utils/day-label";
import type { CSSProperties } from "react";

import { Button } from "@/components/button";
import { EmptyStateTrendPreview } from "@/components/empty-state-preview";
import { EChartsAreaChart } from "@/components/evilcharts/charts/echarts-area-chart";
import { AccuracyClaimsEmpty } from "@/components/geo/accuracy-claims-empty";
import { AccuracyClaimsTable } from "@/components/geo/accuracy-claims-table";
import {
  InstrumentEmpty,
  InstrumentModule,
  InstrumentSection,
} from "@/components/instrument/instrument-module";
import { useGeoProjectScope } from "@/components/providers/geo-project-provider";
import {
  ACCURACY_CHART_CONFIG,
  ACCURACY_COUNT_FORMAT,
  ACCURACY_SCORE_FORMAT,
  ACCURACY_SCORE_HINT,
} from "@/constants/geo-accuracy";
import { useGeoAccuracyAnalysis } from "@/lib/hooks/use-geo-accuracy";
import type { AccuracyTabProps } from "@/types/geo-accuracy";
import {
  accuracyAnalysisStatus,
  accuracyClaimsView,
} from "@/utils/geo-accuracy";
import { withGeoProject } from "@/utils/geo-paths";

function trendEmptyMessage(isAnalyzing: boolean, isScanning: boolean) {
  if (isAnalyzing) {
    return "Checking claims";
  }
  if (isScanning) {
    return "Scan in progress";
  }
  return "Analyze answers to plot accuracy";
}

function formatShare(value: number, total: number): string {
  if (total <= 0) {
    return "—";
  }
  return ACCURACY_SCORE_FORMAT.format(value / total);
}

export function AccuracyTab({
  organizationId,
  organizationSlug,
  isScanning,
}: AccuracyTabProps) {
  const { projectId } = useGeoProjectScope();
  const analysis = useGeoAccuracyAnalysis(organizationId);
  const state = analysis.query.data;
  const result = state?.result;
  const scored = (result?.accurate ?? 0) + (result?.inaccurate ?? 0);
  const status = accuracyAnalysisStatus(state);
  const view = accuracyClaimsView({
    state,
    isAnalyzing: analysis.isAnalyzing,
    isPending: analysis.query.isPending,
    isError: analysis.query.isError,
  });
  const writerHref = withGeoProject(
    `/${organizationSlug}${GEO_WRITER_NAV_LINK}`,
    projectId
  );
  const knowledgeHref = `/${organizationSlug}/brand/identity?view=knowledge`;

  return (
    <div className="mt-6 flex min-w-0 flex-col gap-6">
      <InstrumentModule
        bodyClassName="min-w-0 p-0"
        className="h-full"
        eyebrow="Accuracy"
        hint={ACCURACY_SCORE_HINT}
        variant="table"
      >
        <div className="grid min-w-0 lg:grid-cols-2">
          <div className="min-w-0 lg:border-r">
            <aside
              aria-label="Accuracy summary"
              className="min-w-0 px-5 pt-4 pb-1"
            >
              <div className="space-y-1">
                <p className="text-4xl leading-none font-semibold tracking-tight tabular-nums">
                  {result?.score == null
                    ? "—"
                    : ACCURACY_SCORE_FORMAT.format(result.score)}
                </p>
                <p className="text-muted-foreground max-w-64 text-xs text-balance">
                  Fact accuracy against{" "}
                  {state?.companyName || "your Knowledge facts"}
                  {view.facts.length
                    ? ` · ${ACCURACY_COUNT_FORMAT.format(view.facts.length)} facts`
                    : ""}
                </p>
              </div>
            </aside>
            <div
              aria-label="Accuracy history"
              className="flex min-w-0 flex-col justify-center gap-2 px-4 py-3"
            >
              {result?.points.some((point) => point.score != null) ? (
                <EChartsAreaChart
                  animation={false}
                  className="h-40 min-h-40 w-full"
                  config={ACCURACY_CHART_CONFIG}
                  curveType="monotoneX"
                  data={result.points.map((point) => ({
                    day: point.day,
                    score:
                      point.score == null
                        ? null
                        : Math.round(point.score * 1000) / 10,
                  }))}
                  enableHoverHighlight={false}
                  enableHoverReveal={false}
                  xDataKey="day"
                >
                  <EChartsAreaChart.Grid variant="solid" />
                  <EChartsAreaChart.YAxis
                    hideDots
                    interval={50}
                    max={100}
                    min={0}
                  />
                  <EChartsAreaChart.XAxis
                    dataKey="day"
                    hideDots
                    tickFormatter={formatDayLabel}
                  />
                  <EChartsAreaChart.Area
                    connectNulls={false}
                    dataKey="score"
                    enableBufferLine={false}
                    gapMissing
                    strokeVariant="solid"
                    strokeWidth={2}
                    variant="gradient"
                  />
                </EChartsAreaChart>
              ) : (
                <InstrumentEmpty
                  busy={isScanning || analysis.isAnalyzing}
                  className="h-40 min-h-40 [&_p]:normal-case"
                  message={trendEmptyMessage(analysis.isAnalyzing, isScanning)}
                  preview={<EmptyStateTrendPreview />}
                  seed="Accuracy trend"
                />
              )}
            </div>
          </div>
          <div className="flex min-w-0 flex-col divide-y border-t lg:border-t-0">
            {view.needsFacts ? (
              <div className="space-y-3 px-5 py-5">
                <p className="text-muted-foreground text-sm text-balance">
                  Scan your website or GitHub in Knowledge so claims have a
                  source of truth.
                </p>
                <Button render={<a href={knowledgeHref} />} size="sm">
                  Open Knowledge
                </Button>
              </div>
            ) : (
              <>
                {status ? (
                  <p
                    className="text-muted-foreground px-5 py-3 text-xs"
                    role="status"
                  >
                    {status}
                  </p>
                ) : null}
                <div className="flex flex-1 flex-col justify-center gap-2 px-5 py-4">
                  <p className="text-muted-foreground text-xs">What's new</p>
                  <p className="text-sm font-medium text-balance">
                    {result?.insight ??
                      "Run analysis to see which claims engines get wrong."}
                  </p>
                </div>
                <div className="space-y-2 px-5 py-4">
                  <div
                    aria-hidden="true"
                    className="bg-muted flex h-5 overflow-hidden rounded-md"
                  >
                    <span
                      className="bg-geo-up h-full w-(--accurate-share)"
                      style={
                        {
                          "--accurate-share": `${scored ? ((result?.accurate ?? 0) / scored) * 100 : 0}%`,
                        } as CSSProperties
                      }
                    />
                    <span
                      className="bg-geo-down h-full w-(--inaccurate-share)"
                      style={
                        {
                          "--inaccurate-share": `${scored ? ((result?.inaccurate ?? 0) / scored) * 100 : 0}%`,
                        } as CSSProperties
                      }
                    />
                  </div>
                  <div className="flex flex-wrap justify-between gap-2 text-xs">
                    <span className="text-geo-up">
                      {formatShare(result?.accurate ?? 0, scored)} accurate
                    </span>
                    <span className="text-geo-down">
                      {formatShare(result?.inaccurate ?? 0, scored)} inaccurate
                    </span>
                    <span className="text-muted-foreground">
                      {ACCURACY_COUNT_FORMAT.format(result?.unverifiable ?? 0)}{" "}
                      unverifiable
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </InstrumentModule>
      {view.needsFacts ? null : (
        <InstrumentSection
          bodyClassName="min-w-0 space-y-3"
          className="lg:col-span-12"
          eyebrow="Fact check"
        >
          {analysis.query.isError ? (
            <div
              role="alert"
              className="flex flex-wrap items-center gap-2 text-sm"
            >
              Could not load analysis.
              <Button
                onClick={() => analysis.query.refetch()}
                size="sm"
                variant="ghost"
              >
                Retry analysis lookup
              </Button>
            </div>
          ) : null}
          {analysis.mutationError ? (
            <p className="text-sm" role="alert">
              Analysis request failed. Try again.
            </p>
          ) : null}
          {view.showTable ? (
            <AccuracyClaimsTable
              claims={view.claims}
              facts={view.facts}
              knowledgeHref={knowledgeHref}
              pending={view.pending}
              writerHref={writerHref}
            />
          ) : null}
          {view.showEmpty ? (
            <AccuracyClaimsEmpty
              analyze={analysis.analyze}
              canAnalyze={view.canAnalyze}
              message={view.message}
              retrying={view.retrying || analysis.mutationError}
              title={view.title}
            />
          ) : null}
          <p
            className={
              view.pending ? "text-muted-foreground text-xs" : "sr-only"
            }
            role="status"
          >
            {status}
          </p>
        </InstrumentSection>
      )}
    </div>
  );
}
