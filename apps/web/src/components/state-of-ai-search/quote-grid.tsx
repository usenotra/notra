import { EngineIcon } from "@notra/ui/components/geo/engine-icon";

import { ReportPanel } from "@/components/state-of-ai-search/report-section";
import type {
  StateOfAiSearchEngine,
  StateOfAiSearchQuote,
} from "@/types/state-of-ai-search";
import { formatShortDate } from "@/utils/state-of-ai-search";

/** The claim ends at the first clause break after the brand. */
const CLAIM_END = /[.;:!?—–]|,\s/g;
const CLAIM_MIN_LENGTH = 12;

function splitClaim(text: string, brand: string) {
  const start = text.indexOf(brand);
  if (start === -1) {
    return { before: "", claim: "", after: text };
  }
  CLAIM_END.lastIndex = start + brand.length + CLAIM_MIN_LENGTH;
  const end = CLAIM_END.exec(text)?.index ?? text.length;
  return {
    before: text.slice(0, start),
    claim: text.slice(start, end),
    after: text.slice(end),
  };
}

export function QuoteGrid({
  quotes,
  brand,
  engines,
}: {
  quotes: StateOfAiSearchQuote[];
  brand: string;
  engines: StateOfAiSearchEngine[];
}) {
  return (
    <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      {quotes.map((quote) => {
        const engine = engines.find((item) => item.id === quote.engine);
        const { before, claim, after } = splitClaim(quote.text, brand);
        return (
          <li className="flex" key={`${quote.engine}-${quote.prompt}`}>
            <ReportPanel
              bodyClassName="flex flex-col gap-3 p-4"
              className="flex-1"
              header={
                <>
                  {engine ? (
                    <EngineIcon className="size-3.5" engine={engine.model} />
                  ) : null}
                  <span className="text-foreground">{engine?.label}</span>
                  <time
                    className="ml-auto text-xs font-normal tabular-nums"
                    dateTime={quote.collectedAt}
                  >
                    {formatShortDate(quote.collectedAt)}
                  </time>
                </>
              }
            >
              <blockquote className="text-muted-foreground flex-1 text-sm/6 text-pretty">
                {before}
                {claim ? (
                  <strong className="text-foreground font-medium">
                    {claim}
                  </strong>
                ) : null}
                {after}
              </blockquote>
              <p className="text-muted-foreground truncate text-xs">
                “{quote.prompt}”
              </p>
            </ReportPanel>
          </li>
        );
      })}
    </ul>
  );
}
