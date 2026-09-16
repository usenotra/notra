"use client";

import { SentimentSummary } from "@/components/geo/sentiment-summary";
import { SentimentThemes } from "@/components/geo/sentiment-themes";
import { SentimentTrendCard } from "@/components/geo/sentiment-trend-card";
import { InstrumentModule } from "@/components/instrument/instrument-module";
import {
  SENTIMENT_ANALYZE_ACTION,
  SENTIMENT_POLARITY_CTA,
  SENTIMENT_POLARITY_STYLES,
  SENTIMENT_SCORE_HINT,
} from "@/constants/geo-sentiment";
import {
  useGeoSentiment,
  useGeoSentimentAnalysis,
} from "@/lib/hooks/use-geo-sentiment";
import type { BrandSentimentCardProps } from "@/types/geo-sentiment";
import {
  sentimentHasDisplayableData,
  sentimentThemesState,
} from "@/utils/geo-sentiment";
import { sentimentAnalysisStatus } from "@/utils/sentiment-analysis";

function formatPolarityShare(share: number | null | undefined): string {
  if (share == null) {
    return "—";
  }
  return `${(share * 100).toFixed(1)}%`;
}

function PolarityThemeContent({
  loading,
  polarity,
  themes,
  canAnalyze,
  analysisReady,
  hideEmpty,
}: {
  loading: boolean;
  polarity: "positive" | "negative";
  themes: string[];
  canAnalyze: boolean;
  analysisReady: boolean;
  hideEmpty: boolean;
}) {
  const cta = SENTIMENT_POLARITY_CTA[polarity];

  if (loading) {
    return <p className="text-muted-foreground text-xs">Loading themes…</p>;
  }
  if (themes.length > 0) {
    return (
      <p className="text-sm font-medium text-balance">
        {themes.map((title, index) => (
          <span key={title}>
            {index > 0 ? ", " : ""}
            <a
              className="decoration-border focus-visible:outline-ring underline underline-offset-4 hover:decoration-current"
              href="#sentiment-claims"
            >
              {title}
            </a>
          </span>
        ))}
      </p>
    );
  }
  if (canAnalyze) {
    return (
      <p className="text-muted-foreground text-xs text-balance">
        {cta.subtext}{" "}
        <a
          className="text-foreground decoration-border focus-visible:outline-ring font-medium underline underline-offset-4 hover:decoration-current"
          href="#sentiment-themes"
        >
          {SENTIMENT_ANALYZE_ACTION}
        </a>
      </p>
    );
  }
  if (hideEmpty) {
    return null;
  }
  return (
    <p className="text-muted-foreground text-xs text-balance">
      {analysisReady ? "No themes found" : "Run analysis to find themes"}
    </p>
  );
}

function PolarityPreview() {
  return (
    <div className="flex min-h-64 flex-1 flex-col divide-y">
      <div className="flex flex-1 flex-col justify-center gap-2 px-5 py-5">
        <p
          className={`text-sm font-medium ${SENTIMENT_POLARITY_STYLES.positive.text}`}
        >
          — Positive
        </p>
        <p className="text-muted-foreground text-xs text-balance">
          {SENTIMENT_POLARITY_CTA.positive.subtext}{" "}
          <a
            className="text-foreground decoration-border focus-visible:outline-ring font-medium underline underline-offset-4 hover:decoration-current"
            href="#sentiment-themes"
          >
            {SENTIMENT_ANALYZE_ACTION}
          </a>
        </p>
      </div>
      <div className="flex flex-1 flex-col justify-center gap-2 px-5 py-5">
        <p
          className={`text-sm font-medium ${SENTIMENT_POLARITY_STYLES.negative.text}`}
        >
          — Negative
        </p>
        <p className="text-muted-foreground text-xs text-balance">
          {SENTIMENT_POLARITY_CTA.negative.subtext}{" "}
          <a
            className="text-foreground decoration-border focus-visible:outline-ring font-medium underline underline-offset-4 hover:decoration-current"
            href="#sentiment-themes"
          >
            {SENTIMENT_ANALYZE_ACTION}
          </a>
        </p>
      </div>
    </div>
  );
}

export function BrandSentimentCard({
  organizationId,
  isScanning,
}: BrandSentimentCardProps) {
  const query = useGeoSentiment(organizationId);
  const data = query.isSuccess ? query.data : undefined;
  const analysis = useGeoSentimentAnalysis(organizationId);
  const themes = analysis.query.data?.result?.themes ?? [];
  const showData = sentimentHasDisplayableData(data?.summary);
  const themeView = sentimentThemesState({
    state: analysis.query.data,
    summary: data?.summary,
    isAnalyzing: analysis.isAnalyzing,
    isPending: analysis.query.isPending,
    isError: analysis.query.isError,
    aggregatePending: query.isPending,
  });
  const themeStatus = analysis.query.isError
    ? "Could not load analysis."
    : sentimentAnalysisStatus(analysis.query.data);
  const showThemeStatus =
    themeStatus && themeStatus !== "Analyzing saved answers…";

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <InstrumentModule
        eyebrow="Brand sentiment"
        hint={SENTIMENT_SCORE_HINT}
        variant="table"
        className="h-full"
        bodyClassName="min-w-0 p-0"
      >
        <div className="grid min-w-0 lg:grid-cols-2">
          <div className="min-w-0 lg:border-r">
            <SentimentSummary
              data={data}
              isPending={query.isPending}
              isError={query.isError}
              retry={() => query.refetch()}
            />
            <SentimentTrendCard
              points={data?.points}
              comparison={data?.comparison}
              summary={data?.summary}
              isPending={query.isPending}
              isError={query.isError}
              isScanning={isScanning}
              retry={() => query.refetch()}
            />
          </div>
          <div className="flex min-w-0 flex-col divide-y border-t lg:border-t-0">
            {!showData ? <PolarityPreview /> : null}
            {showData && showThemeStatus ? (
              <p
                role="status"
                className="text-muted-foreground px-5 py-3 text-xs"
              >
                {themeStatus}
              </p>
            ) : null}
            {showData
              ? (["positive", "negative"] as const).map((polarity) => {
                  const polarityThemes = [
                    ...new Set(
                      themes
                        .filter((theme) => theme.polarity === polarity)
                        .map((theme) => theme.title)
                    ),
                  ];
                  const share = data?.summary?.[`${polarity}Share`];

                  return (
                    <div
                      key={polarity}
                      className="flex flex-1 flex-col justify-center gap-2 px-5 py-3"
                    >
                      <p
                        className={`text-sm font-medium capitalize ${SENTIMENT_POLARITY_STYLES[polarity].text}`}
                      >
                        {formatPolarityShare(share)} {polarity}
                      </p>
                      <PolarityThemeContent
                        analysisReady={analysis.query.data?.status === "ready"}
                        canAnalyze={themeView.canAnalyze}
                        hideEmpty={Boolean(showThemeStatus)}
                        loading={themeView.pending}
                        polarity={polarity}
                        themes={polarityThemes}
                      />
                    </div>
                  );
                })
              : null}
            {showData ? (
              <div className="space-y-2 px-5 py-3">
                <div
                  aria-hidden="true"
                  className="bg-muted flex h-5 overflow-hidden rounded-md"
                >
                  {(["positive", "neutral", "negative"] as const).map(
                    (polarity) => (
                      <span
                        key={polarity}
                        className={SENTIMENT_POLARITY_STYLES[polarity].fill}
                        style={{
                          width: `${(data?.summary?.[`${polarity}Share`] ?? 0) * 100}%`,
                        }}
                      />
                    )
                  )}
                </div>
                <div className="flex flex-wrap justify-between gap-2 text-xs">
                  {(["positive", "neutral", "negative"] as const).map(
                    (polarity) => (
                      <span
                        key={polarity}
                        className={`capitalize ${SENTIMENT_POLARITY_STYLES[polarity].text}`}
                      >
                        {formatPolarityShare(
                          data?.summary?.[`${polarity}Share`]
                        )}{" "}
                        {polarity}
                      </span>
                    )
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </InstrumentModule>
      <SentimentThemes
        organizationId={organizationId}
        summary={data?.summary}
        aggregatePending={query.isPending}
      />
    </div>
  );
}
