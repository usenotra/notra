import { Shimmer } from "@notra/ui/components/ai-elements/shimmer";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from "@notra/ui/components/ui/popover";
import { useTranslations } from "next-intl";

import { Button } from "@/components/button";
import { EmptyStateTablePreview } from "@/components/empty-state-preview";
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
  const t = useTranslations("geo.sentimentThemesEmpty");
  if (inline) {
    return (
      <Button size="sm" variant="outline" onClick={analyze}>
        {retrying ? t("retryAnalysis") : t("refreshAnalysis")}
      </Button>
    );
  }
  return (
    <div className="relative min-h-72 w-full overflow-hidden rounded-2xl">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 px-3 pt-3 select-none sm:px-4 sm:pt-4"
      >
        <div className="mask-[linear-gradient(to_bottom,black_0%,transparent_60%)] opacity-[0.3]">
          <EmptyStateTablePreview
            columns={EMPTY_STATE_TABLE_COLUMNS.prompts}
            rows={EMPTY_STATE_TABLE_ROWS}
          />
        </div>
      </div>
      <div className="relative z-10 mx-auto flex w-full max-w-2xl flex-col items-center gap-4 px-6 pt-28 pb-12 text-center">
        <h3 className="text-xl font-semibold text-balance">
          <span
            className="sentiment-state-copy"
            key={analyzing ? "busy" : "idle"}
          >
            {analyzing ? (
              <Shimmer as="span">{t("analyzingThemes")}</Shimmer>
            ) : (
              title
            )}
          </span>
        </h3>
        {message && !analyzing ? (
          <p className="text-muted-foreground max-w-sm text-sm">{message}</p>
        ) : null}
        {canAnalyze || analyzing ? (
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button
              className="relative overflow-hidden"
              disabled={analyzing}
              onClick={analyze}
            >
              {analyzing ? (
                <span
                  aria-hidden="true"
                  className="sentiment-analysis-progress bg-primary-foreground/20 absolute inset-0 origin-left motion-reduce:hidden"
                />
              ) : null}
              <span
                className="sentiment-state-copy relative"
                key={analyzing ? "busy" : "idle"}
              >
                {analyzing
                  ? t("analyzing")
                  : retrying
                    ? t("retryAnalysis")
                    : t("analyzeNow")}
              </span>
            </Button>
            <Popover>
              <PopoverTrigger render={<Button variant="outline" />}>
                {t("howItWorks")}
              </PopoverTrigger>
              <PopoverContent className="max-w-[calc(100vw-2rem)] p-4">
                <PopoverTitle>{t("aboutTitle")}</PopoverTitle>
                <PopoverDescription>{t("aboutDescription")}</PopoverDescription>
                <p className="text-muted-foreground mt-3 text-sm">
                  {t("aboutCost")}
                </p>
              </PopoverContent>
            </Popover>
          </div>
        ) : null}
      </div>
    </div>
  );
}
