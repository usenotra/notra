"use client";

import { InstrumentGrid } from "@notra/ui/components/instrument/instrument-grid";
import { InstrumentSection } from "@notra/ui/components/instrument/instrument-module";
import { Card, CardContent } from "@notra/ui/components/ui/card";
import { useFormatter, useTranslations } from "use-intl";

import { DirectionDelta } from "@/components/geo/directions/direction-delta";
import { PromptResultsTable } from "@/components/geo/directions/prompt-results-table";
import { EngineIcon } from "@/components/geo/engine-icon";
import { MentionRateCard } from "@/components/geo/mention-rate-card";
import { MentionTrendCard } from "@/components/geo/mention-trend-card";
import { ShareOfVoiceCard } from "@/components/geo/share-of-voice-card";
import { TrafficPagesCard } from "@/components/geo/traffic-pages-card";
import {
  GEO_DIRECTIONS_COMPANY,
  GEO_DIRECTIONS_ENGINES,
  GEO_DIRECTIONS_KPIS,
  GEO_DIRECTIONS_OVERVIEW_ENGINES,
  GEO_DIRECTIONS_PAGES,
  GEO_DIRECTIONS_PROMPT_COUNT,
  GEO_DIRECTIONS_SHARE,
  GEO_DIRECTIONS_TIMESERIES,
  GEO_DIRECTIONS_VISIBILITY,
  GEO_DIRECTIONS_VISIBILITY_DELTA,
} from "@/constants/geo-directions";
import { formatMentionRate } from "@/utils/geo-charts";

const AI_VISITS = GEO_DIRECTIONS_KPIS[0];

function HeroRow() {
  const t = useTranslations("geo.directions");
  const format = useFormatter();
  const tCommon = useTranslations("common");
  const best = GEO_DIRECTIONS_ENGINES[0];

  return (
    <InstrumentGrid className="grid-cols-2 lg:grid-cols-4">
      <Card className="h-full min-w-0 overflow-visible">
        <CardContent className="flex min-w-0 flex-1 flex-col gap-2">
          <p className="text-muted-foreground text-sm font-medium">
            {t("labels.aiVisibility")}
          </p>
          <div className="flex min-w-0 items-center gap-2">
            <p className="text-primary text-3xl leading-tight font-bold tabular-nums">
              {formatMentionRate(GEO_DIRECTIONS_VISIBILITY)}
            </p>
            <DirectionDelta delta={GEO_DIRECTIONS_VISIBILITY_DELTA} />
          </div>
          <p className="text-muted-foreground min-w-0 text-xs leading-snug text-pretty">
            {t("instrument.visibilityHint")}
          </p>
        </CardContent>
      </Card>
      <Card className="h-full min-w-0 overflow-visible">
        <CardContent className="flex min-w-0 flex-1 flex-col gap-2">
          <p className="text-muted-foreground text-sm font-medium">
            {t("instrument.bestEngine")}
          </p>
          <p className="flex min-w-0 items-center gap-2 text-3xl leading-tight font-bold">
            {best ? (
              <EngineIcon className="size-6 shrink-0" engine={best.engine} />
            ) : null}
            <span className="min-w-0 wrap-break-word">
              {best?.label ?? tCommon("labels.nA")}
            </span>
          </p>
          <p className="text-muted-foreground min-w-0 text-xs leading-snug">
            {best
              ? t("instrument.bestEngineRate", {
                  rate: formatMentionRate(best.rate),
                })
              : t("instrument.noScans")}
          </p>
        </CardContent>
      </Card>
      <Card className="h-full min-w-0 overflow-visible">
        <CardContent className="flex min-w-0 flex-1 flex-col gap-2">
          <p className="text-muted-foreground text-sm font-medium">
            {t("instrument.trackedPrompts")}
          </p>
          <p className="text-3xl leading-tight font-bold tabular-nums">
            {GEO_DIRECTIONS_PROMPT_COUNT}
          </p>
          <p className="text-muted-foreground min-w-0 text-xs leading-snug">
            {t("instrument.trackedPromptsHint")}
          </p>
        </CardContent>
      </Card>
      <Card className="h-full min-w-0 overflow-visible">
        <CardContent className="flex min-w-0 flex-1 flex-col gap-2">
          <p className="text-muted-foreground text-sm font-medium">
            {t("instrument.aiTraffic")}
          </p>
          <p className="text-3xl leading-tight font-bold tabular-nums">
            {format.number(AI_VISITS?.value ?? 0)}
          </p>
          <p className="text-muted-foreground min-w-0 text-xs leading-snug">
            {t("kpis.aiVisits.hint")}
          </p>
        </CardContent>
      </Card>
    </InstrumentGrid>
  );
}

export function DirectionInstrument() {
  const t = useTranslations("geo.directions.labels");

  return (
    <div className="space-y-4">
      <HeroRow />
      <InstrumentGrid className="grid-cols-1 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <MentionTrendCard points={GEO_DIRECTIONS_TIMESERIES} />
        </div>
        <div className="lg:col-span-4">
          <ShareOfVoiceCard
            companyName={GEO_DIRECTIONS_COMPANY}
            points={[...GEO_DIRECTIONS_SHARE]}
          />
        </div>
        <div className="lg:col-span-8">
          <MentionRateCard
            engines={GEO_DIRECTIONS_OVERVIEW_ENGINES}
            timeseriesPoints={GEO_DIRECTIONS_TIMESERIES}
          />
        </div>
        <div className="lg:col-span-4">
          <TrafficPagesCard pages={[...GEO_DIRECTIONS_PAGES]} />
        </div>
        <div className="lg:col-span-12">
          <InstrumentSection
            eyebrow={t("promptResults")}
            readout={t("positionPerEngine")}
          >
            <PromptResultsTable />
          </InstrumentSection>
        </div>
      </InstrumentGrid>
    </div>
  );
}
