import { exactSentimentExcerpt } from "@notra/geo-core/utils/geo-sentiment";

import type { AnswerSentimentProps } from "@/types/geo-sentiment";

export function AnswerSentiment({ result }: AnswerSentimentProps) {
  const rating =
    result.sentiment === "positive" ||
    result.sentiment === "neutral" ||
    result.sentiment === "negative"
      ? result.sentiment
      : null;
  const label = result.mentioned ? (rating ?? "Unrated") : "Not mentioned";
  const excerpt = exactSentimentExcerpt(result.answer, result.excerpt);
  return (
    <div className="space-y-2 text-sm">
      <p className="text-muted-foreground">
        Brand sentiment{" "}
        <span className="text-foreground ml-2 font-medium capitalize">
          {label}
        </span>
      </p>
      {excerpt ? (
        <p className="break-words whitespace-pre-wrap">
          <span className="sr-only">Exact excerpt: </span>
          <mark className="bg-primary/10 text-foreground rounded-sm px-0.5">
            {excerpt}
          </mark>
        </p>
      ) : null}
    </div>
  );
}
