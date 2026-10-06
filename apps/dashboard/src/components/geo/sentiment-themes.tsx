import { Spinner } from "@notra/ui/components/ui/spinner";
import { useTranslations } from "use-intl";

import { Button } from "@/components/button";
import { SentimentResultsTable } from "@/components/geo/sentiment-results-table";
import { SentimentThemesEmpty } from "@/components/geo/sentiment-themes-empty";
import { InstrumentSection } from "@/components/instrument/instrument-module";
import { GEO_SENTIMENT_EMPTY_LABEL_KEYS } from "@/constants/geo-sentiment";
import { useGeoSentimentAnalysis } from "@/lib/hooks/use-geo-sentiment";
import type { SentimentThemesProps } from "@/types/geo-sentiment";
import { sentimentThemesState } from "@/utils/geo-sentiment";
import { sentimentAnalysisStatus } from "@/utils/sentiment-analysis";

export function SentimentThemes({
  organizationId,
  summary,
  aggregatePending = false,
}: SentimentThemesProps) {
  const t = useTranslations("geo.sentimentThemes");
  const tGeoShared = useTranslations("geo.shared");
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
  let statusText = "";
  if (view.statusKey === "finding") {
    statusText = tGeoShared("findingThemes");
  } else if (view.statusKey) {
    statusText = t(`status.${view.statusKey}`);
  }
  let message = "";
  if (view.message?.kind === "text") {
    message = view.message.text;
  } else if (view.message?.kind === "key") {
    message = t(`messages.${view.message.key}`);
  } else if (view.message?.kind === "empty") {
    message = tGeoShared(GEO_SENTIMENT_EMPTY_LABEL_KEYS[view.message.key]);
  }
  const analysisStatus = sentimentAnalysisStatus(state);
  const showAnalysisStatus =
    view.showResults && analysisStatus !== null && analysisStatus !== "finding";
  const retrying = state?.status === "failed" || mutationError;
  const analyzing = isAnalyzing || state?.status === "pending";
  return (
    <div id="sentiment-themes" className="scroll-mt-24">
      <InstrumentSection
        eyebrow={t("eyebrow")}
        readout={
          (view.pending && !view.showEmpty) ||
          (view.showResults && analyzing) ? (
            <span className="inline-flex items-center gap-2">
              <Spinner className="size-3.5" />
              {view.showResults ? t("updating") : statusText}
            </span>
          ) : undefined
        }
        className="lg:col-span-12"
        bodyClassName="min-w-0 space-y-3"
        action={
          view.canAnalyze && view.showResults ? (
            <SentimentThemesEmpty
              inline
              title={t("noThemesTitle")}
              message={message}
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
            {tGeoShared("couldNotLoadAnalysis")}
            <Button variant="ghost" size="sm" onClick={() => query.refetch()}>
              {t("retryLookup")}
            </Button>
          </div>
        ) : null}
        {mutationError ? (
          <p role="alert" className="text-sm">
            {t("requestFailed")}
          </p>
        ) : null}
        {showAnalysisStatus && analysisStatus !== null ? (
          <p className="text-muted-foreground text-xs">
            {t(`analysisStatus.${analysisStatus}`)}
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
            title={t("noThemesTitle")}
            message={message}
            canAnalyze={view.canAnalyze}
            analyzing={analyzing}
            retrying={retrying}
            analyze={analyze}
          />
        ) : null}
        <p role="status" className="sr-only">
          {statusText}
        </p>
      </InstrumentSection>
    </div>
  );
}
