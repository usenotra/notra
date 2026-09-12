import { Button } from "@/components/button";
import { SentimentResultsTable } from "@/components/geo/sentiment-results-table";
import { SentimentThemesEmpty } from "@/components/geo/sentiment-themes-empty";
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
  return (
    <InstrumentSection
      eyebrow="Sentiment themes"
      className="lg:col-span-12"
      bodyClassName="min-w-0 space-y-3"
    >
      {query.isError ? (
        <div role="alert" className="flex flex-wrap items-center gap-2 text-sm">
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
          key={scopeKey}
          pending={view.pending}
          themes={themes}
        />
      ) : null}
      {view.showEmpty ? (
        <SentimentThemesEmpty
          key={scopeKey}
          title={view.title}
          message={view.message}
          canAnalyze={view.canAnalyze}
          retrying={retrying}
          analyze={analyze}
        />
      ) : null}
      <p
        role="status"
        className={view.pending ? "text-muted-foreground text-xs" : "sr-only"}
      >
        {view.statusText}
      </p>
    </InstrumentSection>
  );
}
