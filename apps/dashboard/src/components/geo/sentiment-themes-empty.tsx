import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from "@notra/ui/components/ui/popover";

import { Button } from "@/components/button";
import { EmptyStateTablePreview } from "@/components/empty-state-preview";
import { StatusSpinner } from "@/components/geo/status-spinner";
import {
  EMPTY_STATE_TABLE_COLUMNS,
  EMPTY_STATE_TABLE_ROWS,
} from "@/constants/empty-state";
import type { SentimentThemesEmptyProps } from "@/types/geo-sentiment";

export function SentimentThemesEmpty({
  title,
  message,
  canAnalyze,
  analyzing = false,
  retrying,
  analyze,
  inline = false,
}: SentimentThemesEmptyProps) {
  if (inline) {
    return (
      <Button size="sm" variant="outline" onClick={analyze}>
        {retrying ? "Retry analysis" : "Refresh analysis"}
      </Button>
    );
  }
  return (
    <div className="relative w-full overflow-hidden rounded-2xl">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 px-3 pt-3 select-none sm:px-4 sm:pt-4"
      >
        <div className="mask-[linear-gradient(to_bottom,black_0%,transparent_100%)] opacity-[0.38]">
          <EmptyStateTablePreview
            columns={EMPTY_STATE_TABLE_COLUMNS.prompts}
            rows={EMPTY_STATE_TABLE_ROWS}
          />
        </div>
      </div>
      <div className="relative z-10 mx-auto flex w-full max-w-2xl flex-col items-center gap-4 px-6 py-12 text-center md:py-16">
        <h3 className="text-xl font-semibold text-balance">
          <span
            className="sentiment-state-copy"
            key={analyzing ? "busy" : "idle"}
          >
            {analyzing ? "Analyzing themes" : title}
          </span>
        </h3>
        {message && !analyzing ? (
          <p className="text-muted-foreground max-w-sm text-sm">{message}</p>
        ) : null}
        {canAnalyze || analyzing ? (
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button className="min-w-32" disabled={analyzing} onClick={analyze}>
              {analyzing ? <StatusSpinner /> : null}
              <span
                className="sentiment-state-copy"
                key={analyzing ? "busy" : "idle"}
              >
                {analyzing
                  ? "Analyzing…"
                  : retrying
                    ? "Retry analysis"
                    : "Analyze now"}
              </span>
            </Button>
            <Popover>
              <PopoverTrigger render={<Button variant="outline" />}>
                How it works
              </PopoverTrigger>
              <PopoverContent className="max-w-[calc(100vw-2rem)] p-4">
                <PopoverTitle>About theme analysis</PopoverTitle>
                <PopoverDescription>
                  Find positives and negatives in a sample of saved answers.
                  Each theme links to its original quotes.
                </PopoverDescription>
                <p className="text-muted-foreground mt-3 text-sm">
                  A new analysis uses AI credits based on token usage, or one AI
                  answer on quota-based plans. Cached analyses have no
                  additional cost. An attempt may still use credits if it fails
                  or finds no themes.
                </p>
              </PopoverContent>
            </Popover>
          </div>
        ) : null}
      </div>
    </div>
  );
}
