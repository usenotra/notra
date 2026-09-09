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
    <section
      className="flex min-h-0 flex-1 flex-col gap-1"
      aria-label="AI model families"
    >
      <div className="flex items-center justify-between gap-3 text-sm font-medium">
        <span>Provider</span>
        <span>Score</span>
      </div>
      <ul
        className="focus-visible:ring-ring max-h-72 overflow-y-auto overscroll-contain outline-none focus-visible:ring-2"
        // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- Keyboard users need to scroll longer provider breakdowns.
        tabIndex={rows.length > 6 ? 0 : undefined}
      >
        {rows.map((row) => (
          <li
            key={row.family}
            className="grid min-h-11 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b last:border-b-0"
          >
            <span className="flex min-w-0 items-center gap-2 text-sm">
              <span className="flex size-7 shrink-0 items-center justify-center">
                <EngineIcon engine={row.iconEngine} />
              </span>
              <span className="break-words">{row.label}</span>
            </span>
            <span className="text-sm tabular-nums">
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
