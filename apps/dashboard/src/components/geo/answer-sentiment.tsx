import { exactSentimentExcerpt } from "@notra/geo-core/utils/geo-sentiment";
import { useTranslations } from "next-intl";

import type { AnswerSentimentProps } from "@/types/geo-sentiment";

export function AnswerSentiment({ result }: AnswerSentimentProps) {
  const t = useTranslations("geo.answerSentiment");
  const tGeoShared = useTranslations("geo.shared");
  const tCommon = useTranslations("common");
  const rating =
    result.sentiment === "positive" ||
    result.sentiment === "neutral" ||
    result.sentiment === "negative"
      ? result.sentiment
      : null;
  let label = tGeoShared("notMentioned");
  if (result.mentioned) {
    label = rating ? tCommon(`labels.${rating}`) : t("unrated");
  }
  const excerpt = exactSentimentExcerpt(result.answer, result.excerpt);
  return (
    <div className="space-y-2 text-sm">
      <p className="text-muted-foreground">
        {tCommon("labels.brandSentiment")}{" "}
        <span className="text-foreground ml-2 font-medium">{label}</span>
      </p>
      {excerpt ? (
        <p className="break-words whitespace-pre-wrap">
          <span className="sr-only">{t("exactExcerpt")}</span>
          <mark className="bg-primary/10 text-foreground rounded-sm px-0.5">
            {excerpt}
          </mark>
        </p>
      ) : null}
    </div>
  );
}
