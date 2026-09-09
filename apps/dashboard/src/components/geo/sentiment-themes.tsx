import { Button } from "@notra/ui/components/ui/button";

import { InstrumentModule } from "@/components/instrument/instrument-module";
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
  summary,
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
      className="h-full lg:col-span-5"
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
      {summary ? <SentimentDistribution summary={summary} /> : null}
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
      <p className="text-muted-foreground text-xs">
        {result.sampled} of {result.eligible} positive or negative answers
        sampled. Up to 12 per polarity; first 2,000 characters per answer. Theme
        evidence counts refer only to this sample.
      </p>
      <SentimentThemeGroup polarity="positive" themes={groups.positive} />
      <SentimentThemeGroup polarity="negative" themes={groups.negative} />
      <p className="text-muted-foreground text-xs">
        Analyzed {result.generatedAt.slice(0, 10)} · AI-extracted themes; exact
        saved quotes.
      </p>
    </>
  );
}

function SentimentThemeGroup({ polarity, themes }: SentimentThemeGroupProps) {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-medium capitalize">{polarity} themes</h3>
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
        <dl className="grid grid-cols-3 gap-3 text-sm">
          {(["positive", "neutral", "negative"] as const).map((polarity) => (
            <div key={polarity}>
              <dt className="text-muted-foreground capitalize">{polarity}</dt>
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
      <p className="text-muted-foreground text-xs">
        All {summary.classifiedMentions} classified mentions in this period.
        Excludes {summary.unknownMentions} unrated mentions and{" "}
        {summary.notMentioned} non-mentions.
      </p>
    </section>
  );
}
