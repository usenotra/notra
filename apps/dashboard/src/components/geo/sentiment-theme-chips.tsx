"use client";

import { useTranslations } from "next-intl";

import { useGeoSentimentAnalysis } from "@/lib/hooks/use-geo-sentiment";
import type { SentimentThemeChipsProps } from "@/types/geo-sentiment";
import { sentimentThemesState } from "@/utils/geo-sentiment";
import { sentimentAnalysisStatus } from "@/utils/sentiment-analysis";

const CHIP_LIMIT = 4;
const POLARITY_ROWS = ["positive", "negative"] as const;
const LINK_CLASS =
  "focus-visible:outline-ring rounded-sm underline decoration-border underline-offset-4 hover:decoration-current focus-visible:outline-2";

function ChipRow({
  polarity,
  titles,
  loading,
  canAnalyze,
  analysisReady,
  hideEmpty,
}: {
  polarity: (typeof POLARITY_ROWS)[number];
  titles: string[];
  loading: boolean;
  canAnalyze: boolean;
  analysisReady: boolean;
  hideEmpty: boolean;
}) {
  const t = useTranslations("geo.sentimentBreakdown.themes");
  const tCommon = useTranslations("common.labels");

  if (loading) {
    return <p className="text-muted-foreground text-xs">{t("loading")}</p>;
  }
  if (titles.length > 0) {
    return (
      <ul className="flex flex-wrap gap-1.5">
        {titles.slice(0, CHIP_LIMIT).map((title) => (
          <li key={title}>
            <a
              className="bg-muted hover:bg-muted/70 focus-visible:outline-ring block rounded-full px-2 py-0.5 text-xs font-medium focus-visible:outline-2"
              href="#sentiment-claims"
            >
              {title}
            </a>
          </li>
        ))}
      </ul>
    );
  }
  if (canAnalyze) {
    return (
      <p className="text-muted-foreground text-xs text-balance">
        {t(`cta.${polarity}`)}{" "}
        <a
          className={`text-foreground font-medium ${LINK_CLASS}`}
          href="#sentiment-themes"
        >
          {tCommon("analyze")}
        </a>
      </p>
    );
  }
  if (hideEmpty) {
    return null;
  }
  return (
    <p className="text-muted-foreground text-xs">
      {analysisReady ? t("none") : t("runAnalysis")}
    </p>
  );
}

export function SentimentThemeChips({
  organizationId,
  summary,
}: SentimentThemeChipsProps) {
  const t = useTranslations("geo.sentimentBreakdown.themes");
  const tCommon = useTranslations("common.labels");
  const tGeoShared = useTranslations("geo.shared");
  const analysis = useGeoSentimentAnalysis(organizationId);
  const state = analysis.query.data;
  const themes = analysis.query.isError ? [] : (state?.result?.themes ?? []);
  const view = sentimentThemesState({
    state,
    summary,
    isAnalyzing: analysis.isAnalyzing,
    isPending: analysis.query.isPending,
    isError: analysis.query.isError,
    aggregatePending: false,
  });
  const statusKey = sentimentAnalysisStatus(state);
  let status = "";
  if (analysis.query.isError) {
    status = tGeoShared("couldNotLoadAnalysis");
  } else if (statusKey === "finding") {
    status = tGeoShared("findingThemes");
  } else if (statusKey) {
    status = t(`status.${statusKey}`);
  }
  const showStatus =
    Boolean(status) && (analysis.query.isError || state?.status !== "pending");

  return (
    <div className="flex flex-col gap-3 border-t pt-4">
      {showStatus ? (
        <p className="text-muted-foreground text-xs" role="status">
          {status}
        </p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        {POLARITY_ROWS.map((polarity) => (
          <div className="flex flex-col gap-2" key={polarity}>
            <p className="text-muted-foreground text-xs">{tCommon(polarity)}</p>
            <ChipRow
              analysisReady={state?.status === "ready"}
              canAnalyze={view.canAnalyze}
              hideEmpty={showStatus}
              loading={view.pending}
              polarity={polarity}
              titles={[
                ...new Set(
                  themes
                    .filter((theme) => theme.polarity === polarity)
                    .map((theme) => theme.title)
                ),
              ]}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
