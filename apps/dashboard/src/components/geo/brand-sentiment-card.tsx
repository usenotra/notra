"use client";

import { SentimentSummary } from "@/components/geo/sentiment-summary";
import { SentimentThemes } from "@/components/geo/sentiment-themes";
import { SentimentTrendCard } from "@/components/geo/sentiment-trend-card";
import { InstrumentModule } from "@/components/instrument/instrument-module";
import {
  SENTIMENT_SCORE_HINT,
  SENTIMENT_POLARITY_STYLES,
} from "@/constants/geo-sentiment";
import {
  useGeoSentiment,
  useGeoSentimentAnalysis,
} from "@/lib/hooks/use-geo-sentiment";
import type { BrandSentimentCardProps } from "@/types/geo-sentiment";

export function BrandSentimentCard({
  organizationId,
  isScanning,
}: BrandSentimentCardProps) {
  const query = useGeoSentiment(organizationId);
  const data = query.isSuccess ? query.data : undefined;
  const analysis = useGeoSentimentAnalysis(organizationId);
  const themes =
    analysis.query.data?.status === "ready"
      ? (analysis.query.data.result?.themes ?? [])
      : [];
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
            {(["positive", "negative"] as const).map((polarity) => (
              <div
                key={polarity}
                className="flex flex-1 flex-col justify-center gap-2 px-5 py-3"
              >
                <p
                  className={`text-sm font-medium capitalize ${SENTIMENT_POLARITY_STYLES[polarity].text}`}
                >
                  {data?.summary[`${polarity}Share`] == null
                    ? "—"
                    : `${((data.summary[`${polarity}Share`] ?? 0) * 100).toFixed(1)}%`}{" "}
                  {polarity}
                </p>
                <p className="text-sm font-medium text-balance">
                  {query.isPending || analysis.query.isPending
                    ? "Loading themes…"
                    : null}
                  {themes
                    .filter((theme) => theme.polarity === polarity)
                    .map((theme, index) => (
                      <span key={theme.title}>
                        {index > 0 ? ", " : ""}
                        <a
                          className="decoration-border focus-visible:outline-ring underline underline-offset-4 hover:decoration-current"
                          href="#sentiment-claims"
                        >
                          {theme.title}
                        </a>
                      </span>
                    ))}
                  {!query.isPending &&
                  !analysis.query.isPending &&
                  !themes.some((theme) => theme.polarity === polarity) ? (
                    <span>
                      {analysis.query.data?.status === "ready"
                        ? "No themes found"
                        : "Run analysis to find themes"}
                    </span>
                  ) : null}
                </p>
              </div>
            ))}
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
                        width: `${(data?.summary[`${polarity}Share`] ?? 0) * 100}%`,
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
                      {data?.summary[`${polarity}Share`] == null
                        ? "—"
                        : `${((data.summary[`${polarity}Share`] ?? 0) * 100).toFixed(1)}%`}{" "}
                      {polarity}
                    </span>
                  )
                )}
              </div>
            </div>
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
