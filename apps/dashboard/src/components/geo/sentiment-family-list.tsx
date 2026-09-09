import { GeoBar } from "@notra/ui/components/geo/geo-bar";

import { EngineIcon } from "@/components/geo/engine-icon";
import { SENTIMENT_SCORE_FORMAT } from "@/constants/geo-sentiment";
import type { SentimentFamilyListProps } from "@/types/geo-sentiment";
import { sentimentFamilyRows } from "@/utils/geo-sentiment";

export function SentimentFamilyList({ engines }: SentimentFamilyListProps) {
  const rows = sentimentFamilyRows(engines);
  if (rows.length === 0) {
    return null;
  }
  return (
    <section className="space-y-3" aria-label="AI model families">
      <h2 className="text-muted-foreground text-sm font-medium">
        AI model families
      </h2>
      <ul className="space-y-4">
        {rows.map((row) => (
          <li
            key={row.family}
            className="grid grid-cols-[minmax(0,1fr)_minmax(3rem,1fr)_3rem] items-center gap-3 sm:grid-cols-[minmax(0,12rem)_1fr_3rem] sm:gap-6"
          >
            <span className="flex min-w-0 items-center gap-2 text-sm">
              <EngineIcon engine={row.family} className="size-5 shrink-0" />
              <span className="break-words">{row.label}</span>
            </span>
            <span aria-hidden="true">
              {row.score === null ? null : (
                <GeoBar
                  value={row.score}
                  max={100}
                  fillClassName="bg-geo-search/50"
                />
              )}
            </span>
            <span className="text-right text-sm tabular-nums">
              {row.score === null ? (
                <>
                  <span aria-hidden="true">—</span>
                  <span className="sr-only">Unrated</span>
                </>
              ) : (
                <>
                  {SENTIMENT_SCORE_FORMAT.format(row.score)}
                  <span className="sr-only"> out of 100</span>
                </>
              )}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
