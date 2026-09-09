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
      <h3 className="text-muted-foreground text-sm font-medium">
        AI model families
      </h3>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {rows.map((row) => (
          <li
            key={row.family}
            className="bg-muted/40 flex min-w-0 flex-col gap-3 rounded-xl p-3"
          >
            <span className="flex min-w-0 items-center gap-2 text-sm">
              <EngineIcon engine={row.iconEngine} className="size-5 shrink-0" />
              <span className="break-words">{row.label}</span>
            </span>
            <span className="text-xl font-medium tabular-nums">
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
