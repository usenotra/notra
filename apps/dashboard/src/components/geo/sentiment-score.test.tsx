import { expect, test } from "bun:test";

import { summarizeSentiment } from "@notra/geo-core/utils/geo-sentiment";
import { TooltipProvider } from "@notra/ui/components/ui/tooltip";
import { renderToStaticMarkup } from "react-dom/server";

import { SentimentScore } from "./sentiment-score";

test("an unrated score has no numeric denominator or meter", () => {
  const html = renderToStaticMarkup(
    <SentimentScore summary={summarizeSentiment([])} />
  );
  expect(html).toContain("—");
  expect(html).not.toContain("/ 100");
  expect(html).not.toContain("<meter");
});

test("zero is a valid score with its denominator and meter", () => {
  const html = renderToStaticMarkup(
    <TooltipProvider>
      <SentimentScore summary={{ ...summarizeSentiment([]), score: 0 }} />
    </TooltipProvider>
  );
  expect(html).toContain("/ 100");
  expect(html).toContain('value="0"');
  expect(html).toContain("<meter");
});
