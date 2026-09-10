import { Button } from "@notra/ui/components/ui/button";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@notra/ui/components/ui/table";
import { useId, useState } from "react";

import {
  InstrumentEmpty,
  InstrumentModule,
} from "@/components/instrument/instrument-module";
import { SENTIMENT_POLARITY_STYLES } from "@/constants/geo-sentiment";
import { useGeoSentimentAnalysis } from "@/lib/hooks/use-geo-sentiment";
import type {
  SentimentThemesProps,
  SentimentThemeRowProps,
} from "@/types/geo-sentiment";
import { sentimentAnalysisAction } from "@/utils/geo-sentiment";

export function SentimentThemes({
  organizationId,
  summary,
}: SentimentThemesProps) {
  const { query, isAnalyzing, analyze, mutationError } =
    useGeoSentimentAnalysis(organizationId);
  const state = query.data;
  const busy = isAnalyzing || state?.status === "pending";
  const noAnswers =
    summary &&
    summary.classifiedMentions +
      summary.unknownMentions +
      summary.notMentioned ===
      0;
  const noRatings = summary && summary.classifiedMentions === 0;
  const action = sentimentAnalysisAction({
    status: state?.status,
    busy,
    loading: query.isPending,
    failed: query.isError,
  });
  let message =
    state?.message ?? "Analyze saved answers to find supported themes.";
  if (state?.status === "ready") {
    message = "No supported themes in the sampled answers.";
  }
  if (state?.status === "unavailable") {
    message = "Analysis is unavailable. Try again later.";
  }
  if (state?.status === "failed") {
    message = "Analysis failed. Retry to analyze these answers.";
  }
  if (noRatings) {
    message = "No rated mentions in this period.";
  }
  if (noAnswers) {
    message = "No saved answers in this period.";
  }
  if (busy) {
    message = "Analyzing saved answers…";
  }
  const themes = state?.result?.themes ?? [];
  const showResults =
    !query.isPending &&
    !query.isError &&
    !busy &&
    !noRatings &&
    themes.length > 0;

  return (
    <InstrumentModule
      eyebrow="Sentiment themes"
      variant="table"
      className="lg:col-span-12"
      bodyClassName="min-w-0 gap-3"
      action={
        <Button
          size="sm"
          variant="ghost"
          disabled={action.disabled || !!noRatings}
          onClick={analyze}
        >
          {action.label}
        </Button>
      }
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
      <Table
        className="table-fixed"
        aria-label="Sentiment themes"
        aria-busy={query.isPending || busy}
      >
        <TableHeader>
          <TableRow>
            <TableHead className="w-24">Polarity</TableHead>
            <TableHead>Theme</TableHead>
            <TableHead className="w-20 px-2 text-right">Evidence</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {query.isPending || busy
            ? [0, 1, 2].map((row) => (
                <TableRow key={row}>
                  <TableCell>
                    <Skeleton className="h-4 w-14" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-full max-w-80" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="ml-auto h-4 w-6" />
                  </TableCell>
                </TableRow>
              ))
            : null}
          {showResults
            ? themes.map((theme) => (
                <SentimentThemeRow
                  key={`${theme.polarity}-${theme.title}`}
                  theme={theme}
                />
              ))
            : null}
          {!query.isPending && !busy && !query.isError && !showResults ? (
            <TableRow>
              <TableCell colSpan={3} className="whitespace-normal">
                <InstrumentEmpty
                  className="min-h-28"
                  message={message}
                  seed="Sentiment themes"
                />
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
      <p
        role="status"
        className={
          query.isPending || busy ? "text-muted-foreground text-xs" : "sr-only"
        }
      >
        {query.isPending ? "Loading analysis…" : busy ? message : ""}
      </p>
      {showResults && state?.result ? (
        <details className="text-muted-foreground text-xs">
          <summary className="focus-visible:outline-ring cursor-pointer rounded-sm py-1 focus-visible:outline-2">
            {state.result.sampled} sampled answers · Sampling details
          </summary>
          <p className="pt-2">
            {state.result.sampled} of {state.result.eligible} eligible positive
            or negative answers. Up to 12 per polarity; first 2,000 answer
            characters and 500 prompt characters per check. Evidence counts
            refer to this sample. Quotes are exact saved text. Analyzed{" "}
            {state.result.generatedAt.slice(0, 10)}.
          </p>
        </details>
      ) : null}
      {!noRatings && state?.status === "stale" ? (
        <p className="text-muted-foreground text-xs">
          Analysis uses AI credits or one AI answer from your plan.
        </p>
      ) : null}
    </InstrumentModule>
  );
}

function SentimentThemeRow({ theme }: SentimentThemeRowProps) {
  const [expanded, setExpanded] = useState(false);
  const id = useId();
  return (
    <>
      <TableRow>
        <TableCell
          className={`align-top text-xs capitalize ${SENTIMENT_POLARITY_STYLES[theme.polarity].text}`}
        >
          {theme.polarity}
        </TableCell>
        <TableCell className="p-0 whitespace-normal">
          <button
            type="button"
            className="focus-visible:outline-ring flex w-full items-start gap-2 rounded-sm px-3 py-3 text-left text-sm focus-visible:outline-2"
            aria-expanded={expanded}
            aria-controls={id}
            onClick={() => setExpanded((value) => !value)}
          >
            <span aria-hidden="true">{expanded ? "−" : "+"}</span>
            <span className="min-w-0 break-words">{theme.title}</span>
          </button>
        </TableCell>
        <TableCell className="px-2 text-right align-top tabular-nums">
          {theme.evidence.length}
        </TableCell>
      </TableRow>
      <TableRow hidden={!expanded} id={id}>
        <TableCell colSpan={3} className="whitespace-normal">
          <ul className="space-y-4">
            {theme.evidence.map((evidence) => (
              <li key={evidence.checkId} className="space-y-1">
                <blockquote className="border-primary/30 border-l-2 pl-3 text-sm [overflow-wrap:anywhere] whitespace-pre-wrap">
                  {evidence.quote}
                </blockquote>
                <p className="text-muted-foreground text-xs [overflow-wrap:anywhere]">
                  {evidence.engine} · {evidence.capturedAt.slice(0, 10)} UTC
                </p>
                <p className="text-muted-foreground text-xs [overflow-wrap:anywhere]">
                  Prompt: {evidence.prompt}
                </p>
              </li>
            ))}
          </ul>
        </TableCell>
      </TableRow>
    </>
  );
}
