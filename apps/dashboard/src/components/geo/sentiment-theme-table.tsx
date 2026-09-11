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

import { SENTIMENT_POLARITY_STYLES } from "@/constants/geo-sentiment";
import type {
  SentimentThemeRowProps,
  SentimentThemeTableProps,
} from "@/types/geo-sentiment";

export function SentimentThemeTable({
  themes,
  pending,
}: SentimentThemeTableProps) {
  return (
    <div className="border-border overflow-hidden rounded-2xl border">
      <Table
        className="table-fixed"
        aria-label="Sentiment themes"
        aria-busy={pending}
      >
        <TableHeader>
          <TableRow>
            <TableHead className="w-24">Polarity</TableHead>
            <TableHead>Theme</TableHead>
            <TableHead className="w-20 px-2 text-right">Evidence</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pending
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
            : themes.map((theme) => (
                <SentimentThemeRow
                  key={`${theme.polarity}-${theme.title}`}
                  theme={theme}
                />
              ))}
        </TableBody>
      </Table>
    </div>
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
          <span className="sr-only">
            {theme.evidence.length > 1
              ? " sampled answers, recurring"
              : " sampled answer, single source"}
          </span>
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
