import { Button } from "@/components/button";
import { SentimentResultsTable } from "@/components/geo/sentiment-results-table";
import { SentimentThemesEmpty } from "@/components/geo/sentiment-themes-empty";
import { StatusSpinner } from "@/components/geo/status-spinner";
import { InstrumentSection } from "@/components/instrument/instrument-module";
import { useGeoSentimentAnalysis } from "@/lib/hooks/use-geo-sentiment";
import type { SentimentThemesProps } from "@/types/geo-sentiment";
import { sentimentThemesState } from "@/utils/geo-sentiment";

export function SentimentThemes({
  organizationId,
  summary,
  aggregatePending = false,
}: SentimentThemesProps) {
  const { query, isAnalyzing, analyze, mutationError, scopeKey } =
    useGeoSentimentAnalysis(organizationId);
  const state = query.data;
  const view = sentimentThemesState({
    state,
    summary,
    isAnalyzing,
    isPending: query.isPending,
    isError: query.isError,
    aggregatePending,
  });
  const themes = state?.result?.themes ?? [];
  const retrying = state?.status === "failed" || mutationError;
  const analyzing = isAnalyzing || state?.status === "pending";
  return (
    <div id="sentiment-themes" className="scroll-mt-24">
      <InstrumentSection
        eyebrow="Sentiment themes"
        readout={
          (view.pending && !view.showEmpty) ||
          (view.showResults && analyzing) ? (
            <span className="inline-flex items-center gap-2">
              <StatusSpinner />
              {view.showResults ? "Updating themes…" : view.statusText}
            </span>
          ) : undefined
        }
        className="lg:col-span-12"
        bodyClassName="min-w-0 space-y-3"
        action={
          view.canAnalyze && view.showResults ? (
            <SentimentThemesEmpty
              inline
              title={view.title}
              message={view.message}
              canAnalyze={view.canAnalyze}
              retrying={retrying}
              analyze={analyze}
            />
          ) : null
        }
      >
        {query.isError ? (
          <div
            role="alert"
            className="flex flex-wrap items-center gap-2 text-sm"
          >
            Could not load analysis.
            <Button variant="ghost" size="sm" onClick={() => query.refetch()}>
              Retry analysis lookup
            </Button>
          </div>
        ) : null}
        {mutationError ? (
          <p role="alert" className="text-sm">
            Analysis request failed. Try again.
          </p>
        ) : null}
        {view.showTable ? (
          <SentimentResultsTable
            key={`table:${scopeKey}`}
            pending={view.pending}
            themes={themes}
          />
        ) : null}
        {view.showEmpty ? (
          <SentimentThemesEmpty
            key={`empty:${scopeKey}`}
            title={view.title}
            message={view.message}
            canAnalyze={view.canAnalyze}
            analyzing={analyzing}
            retrying={retrying}
            analyze={analyze}
          />
        ) : null}
        <p role="status" className="sr-only">
          {view.statusText}
        </p>
      </InstrumentSection>
    </div>
  );
}
