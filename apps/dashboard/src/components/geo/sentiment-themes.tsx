import { Button } from "@notra/ui/components/ui/button";

import { InstrumentModule } from "@/components/instrument/instrument-module";
import { SENTIMENT_POLARITY_STYLES } from "@/constants/geo-sentiment";
import { useGeoSentimentAnalysis } from "@/lib/hooks/use-geo-sentiment";
import type {
  SentimentThemesProps,
  SentimentAnalysisNoticeProps,
  SentimentThemeResultsProps,
  SentimentThemeGroupProps,
  SentimentScoreProps,
} from "@/types/geo-sentiment";
import {
  sentimentAnalysisAction,
  sentimentThemeGroups,
  sentimentAnalysisNotice,
} from "@/utils/geo-sentiment";

export function SentimentThemes({
  organizationId,
}: SentimentThemesProps) {
  const { query, isAnalyzing, analyze, mutationError } =
    useGeoSentimentAnalysis(organizationId);
  const state = query.data;
  const busy = isAnalyzing || state?.status === "pending";
  const action = sentimentAnalysisAction({
    status: state?.status,
    busy,
    loading: query.isPending,
    failed: query.isError,
  });
  return (
    <InstrumentModule
      eyebrow="Sentiment themes"
      variant="table"
       className="h-full lg:col-span-12"
      bodyClassName="flex flex-col gap-5"
      action={
        <Button
          size="sm"
          variant="ghost"
          disabled={action.disabled}
          onClick={analyze}
        >
          {action.label}
        </Button>
      }
    >
      <SentimentAnalysisNotice
        busy={busy}
        state={state}
        loading={query.isPending}
        failedLookup={query.isError}
        failedMutation={mutationError}
        retry={() => {
          void query.refetch();
        }}
      />
      {state?.result ? <SentimentThemeResults result={state.result} /> : null}
    </InstrumentModule>
  );
}

function SentimentAnalysisNotice({
  busy,
  state,
  loading,
  failedLookup,
  failedMutation,
  retry,
}: SentimentAnalysisNoticeProps) {
  const notice = sentimentAnalysisNotice(state, busy);
  return (
    <>
      {notice.showUsage ? (
        <p className="text-muted-foreground text-xs">
          Each analysis attempt uses AI credits or one AI answer from your plan.
        </p>
      ) : null}
      <p
        role="status"
        className={notice.message ? "text-muted-foreground text-sm" : "sr-only"}
      >
        {notice.message}
      </p>
      {loading ? (
        <p className="text-muted-foreground text-sm">Loading analysis…</p>
      ) : null}
      {failedLookup ? (
        <div role="alert">
          <p>Could not load analysis.</p>
          <Button variant="ghost" size="sm" onClick={retry}>
            Retry analysis lookup
          </Button>
        </div>
      ) : null}
      {failedMutation ? (
        <p role="alert" className="text-sm">
          Analysis request failed. Try again.
        </p>
      ) : null}
    </>
  );
}

function SentimentThemeResults({ result }: SentimentThemeResultsProps) {
  const groups = sentimentThemeGroups(result.themes);
  return (
    <>
      <div className="text-muted-foreground space-y-1 text-xs">
        <p>
          Based on {result.sampled} sampled answers · Analyzed{" "}
          {result.generatedAt.slice(0, 10)}
        </p>
        <details>
          <summary className="focus-visible:outline-ring cursor-pointer rounded-sm py-1 focus-visible:outline-2">
            Sampling details
          </summary>
          <p className="pt-1">
            {result.sampled} of {result.eligible} eligible positive or negative
            answers. Up to 12 per polarity, selected deterministically; first
            2,000 answer characters and 500 prompt characters per check. Theme
            evidence counts refer only to this sample. Quotes are exact saved
            text.
          </p>
        </details>
      </div>
      <SentimentThemeGroup polarity="positive" themes={groups.positive} />
      <SentimentThemeGroup polarity="negative" themes={groups.negative} />
    </>
  );
}

function SentimentThemeGroup({ polarity, themes }: SentimentThemeGroupProps) {
  return (
    <section className="space-y-2">
      <h3
        className={`text-sm font-medium capitalize ${SENTIMENT_POLARITY_STYLES[polarity].text}`}
      >
        {polarity} themes
      </h3>
      {themes.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No supported {polarity} themes in the sample.
        </p>
      ) : null}
      {themes.map((theme) => (
        <details
          key={`${theme.polarity}-${theme.title}`}
          className="border-b pb-2 last:border-b-0"
        >
          <summary className="focus-visible:outline-ring cursor-pointer rounded-sm py-2 text-sm focus-visible:outline-2">
            <span className="font-medium">{theme.title}</span>
            <span className="text-muted-foreground ml-2 text-xs">
              {theme.evidence.length === 1
                ? "Single source"
                : `${theme.evidence.length} sampled answers · Recurring`}
            </span>
          </summary>
          <ul className="space-y-3 pt-2">
            {theme.evidence.map((evidence) => (
              <li key={evidence.checkId} className="space-y-1 text-sm">
                <blockquote className="border-primary/30 border-l-2 pl-3 break-words whitespace-pre-wrap">
                  {evidence.quote}
                </blockquote>
                <p className="text-muted-foreground text-xs break-words">
                  {evidence.engine} · {evidence.capturedAt.slice(0, 10)} UTC
                </p>
                <p className="text-muted-foreground text-xs break-words">
                  Prompt: {evidence.prompt}
                </p>
              </li>
            ))}
          </ul>
        </details>
      ))}
    </section>
  );
}

function SentimentDistribution({ summary }: SentimentScoreProps) {
  return (
    <section className="space-y-3 border-t pt-4">
      <h3 className="text-sm font-medium">Classified mentions</h3>
      {summary.classifiedMentions > 0 ? (
        <div
          aria-hidden="true"
          className="flex h-2 w-full overflow-hidden rounded-full"
          data-testid="sentiment-distribution-bar"
        >
          {(["positive", "neutral", "negative"] as const).map((polarity) => (
            <span
              key={polarity}
              data-polarity={polarity}
              className={`h-full shrink-0 ${SENTIMENT_POLARITY_STYLES[polarity].fill}`}
              style={{
                width: `${(summary[polarity] / summary.classifiedMentions) * 100}%`,
              }}
            />
          ))}
        </div>
      ) : null}
      {summary.classifiedMentions > 0 ? (
        <dl className="grid grid-cols-3 gap-3 text-sm">
          {(["positive", "neutral", "negative"] as const).map((polarity) => (
            <div key={polarity}>
              <dt
                className={`flex items-center gap-1.5 capitalize ${SENTIMENT_POLARITY_STYLES[polarity].text}`}
              >
                <span
                  aria-hidden="true"
                  className={`size-1.5 shrink-0 rounded-full ${SENTIMENT_POLARITY_STYLES[polarity].fill}`}
                />
                {polarity}
              </dt>
              <dd className="mt-1 font-medium tabular-nums">
                {Math.round(
                  (summary[polarity] / summary.classifiedMentions) * 100
                )}
                %{" "}
                <span className="text-muted-foreground font-normal">
                  ({summary[polarity]})
                </span>
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-muted-foreground text-sm">
          No classified mentions in this period.
        </p>
      )}
      <details className="text-muted-foreground text-xs">
        <summary className="focus-visible:outline-ring cursor-pointer rounded-sm py-1 focus-visible:outline-2">
          Distribution details
        </summary>
        <p className="pt-1">
          All {summary.classifiedMentions} classified mentions in this period.
          Excludes {summary.unknownMentions} unrated mentions and{" "}
          {summary.notMentioned} non-mentions. Percentages are rounded; segment
          widths use the exact counts.
        </p>
      </details>
    </section>
  );
}
