"use client";

import {
  Alert02Icon,
  ArrowDown01Icon,
  ArrowUp01Icon,
  LinkSquare02Icon,
  Refresh03Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { AGENT_READINESS_MAX_SCORE } from "@notra/geo-core/constants/agent-readiness";
import {
  buildAgentReadinessAllFixesPrompt,
  getAgentReadinessOpenPoints,
  getAgentReadinessScoreBand,
  groupAgentReadinessIssues,
} from "@notra/geo-core/utils/agent-readiness";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import { InstrumentModule } from "@notra/ui/components/instrument/instrument-module";
import type { CSSProperties, ReactNode } from "react";
import { useFormatter, useNow, useTranslations } from "use-intl";

import { Button } from "@/components/button";
import { AgentReadinessCopyPromptButton } from "@/components/geo/agent-readiness/readiness-copy-prompt-button";
import { AgentReadinessScoreGauge } from "@/components/geo/agent-readiness/readiness-score-gauge";
import { AGENT_READINESS_BAND_BG_CLASS } from "@/constants/agent-readiness";
import { AGENT_READINESS_FIX_COPY_KINDS } from "@/constants/geo-analytics";
import { trackEvent } from "@/lib/analytics/posthog-client";
import { cn } from "@/lib/utils";
import type {
  AgentReadinessNextStepProps,
  AgentReadinessScoreCardProps,
  AgentReadinessScoreDeltaProps,
  AgentReadinessTierRowProps,
} from "@/types/agent-readiness";

const strong = (chunks: ReactNode) => (
  <span className="text-foreground font-medium">{chunks}</span>
);

function ScoreDelta({ score, previousScore }: AgentReadinessScoreDeltaProps) {
  const t = useTranslations("geo.agentReadiness.scoreCard");

  if (previousScore === null || previousScore === score) {
    return null;
  }
  const delta = Math.round(score - previousScore);
  const improved = delta > 0;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-medium tabular-nums",
        improved ? "text-success" : "text-destructive"
      )}
    >
      <HugeiconsIcon
        icon={improved ? ArrowUp01Icon : ArrowDown01Icon}
        size={12}
      />
      {t("sinceLastScan", { delta: `${improved ? "+" : ""}${delta}` })}
    </span>
  );
}

function TierRow({ label, tier }: AgentReadinessTierRowProps) {
  const t = useTranslations("geo.agentReadiness.scoreCard");
  const format = useFormatter();
  const band = getAgentReadinessScoreBand(
    tier.total > 0 ? (tier.passing / tier.total) * AGENT_READINESS_MAX_SCORE : 0
  );
  const percent =
    tier.total > 0 ? Math.min(100, (tier.passing / tier.total) * 100) : 0;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground tabular-nums">
          {t.rich("tierSummary", {
            passing: tier.passing,
            total: tier.total,
            earned: format.number(tier.earned, { maximumFractionDigits: 1 }),
            available: format.number(tier.available, {
              maximumFractionDigits: 1,
            }),
            strong,
          })}
        </span>
      </div>
      <div
        aria-label={t("checksPassingAria", {
          passing: tier.passing,
          total: tier.total,
          label,
        })}
        aria-valuemax={tier.total}
        aria-valuemin={0}
        aria-valuenow={tier.passing}
        className="bg-muted-foreground/15 h-1.5 overflow-hidden rounded-full"
        role="progressbar"
      >
        <div
          className={cn(
            "duration-slower transition-width h-full w-(--passing) rounded-full ease-out",
            AGENT_READINESS_BAND_BG_CLASS[band.key]
          )}
          style={{ "--passing": `${percent}%` } as CSSProperties}
        />
      </div>
    </div>
  );
}

function NextStep({
  issues,
  targetUrl,
  mustDoOpenPoints,
}: AgentReadinessNextStepProps) {
  const t = useTranslations("geo.agentReadiness");
  const format = useFormatter();
  const groups = groupAgentReadinessIssues(issues);
  const topIssue = groups.mustDo[0] ?? groups.shouldDo[0];

  if (!topIssue) {
    return null;
  }
  const masterPrompt = buildAgentReadinessAllFixesPrompt(
    targetUrl,
    groups.mustDo.length > 0 ? groups.mustDo : groups.shouldDo
  );

  return (
    <div className="bg-muted/40 flex flex-col gap-3 border-t px-6 py-3 text-sm sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center">
        <HugeiconsIcon
          className="text-warning mt-0.5 shrink-0 sm:mt-0"
          icon={Alert02Icon}
          size={16}
        />
        <p className="text-muted-foreground min-w-0 flex-1">
          {groups.mustDo.length > 0
            ? t.rich("scoreCard.nextStepMustDo", {
                count: groups.mustDo.length,
                points: format.number(mustDoOpenPoints, {
                  maximumFractionDigits: 1,
                }),
                name: topIssue.name,
                strong,
              })
            : t.rich("scoreCard.nextStepShouldDo", {
                name: topIssue.name,
                strong,
              })}
        </p>
      </div>
      <AgentReadinessCopyPromptButton
        copyKind={AGENT_READINESS_FIX_COPY_KINDS.MASTER}
        label={t("checklist.copyMasterPrompt")}
        prompt={masterPrompt}
        size="xs"
      />
    </div>
  );
}

export function AgentReadinessScoreCard({
  report,
  targetUrl,
  previousScore,
  isScanning,
  onRescan,
}: AgentReadinessScoreCardProps) {
  const t = useTranslations("geo.agentReadiness");
  const tGeoShared = useTranslations("geo.shared");
  const format = useFormatter();
  const now = useNow({ updateInterval: 60_000 });
  const breakdown = report.scoreBreakdown;
  const score = report.score;
  const band = score === null ? null : getAgentReadinessScoreBand(score);
  const openPoints = breakdown ? getAgentReadinessOpenPoints(breakdown) : null;

  return (
    <InstrumentModule
      action={
        <Button
          disabled={isScanning}
          onClick={onRescan}
          size="sm"
          variant="outline"
        >
          <HugeiconsIcon icon={Refresh03Icon} size={16} />
          {isScanning ? tGeoShared("scanning") : tGeoShared("rescan")}
        </Button>
      }
      bodyClassName="gap-0 p-0"
      eyebrow={t("scoreCard.eyebrow")}
      readout={
        <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
          {report.scannedAt ? (
            <span>
              {t("scoreCard.scanned", {
                time: format.relativeTime(new Date(report.scannedAt), now),
              })}
            </span>
          ) : null}
          {report.eligibleChecks === null ? null : (
            <span className="hidden sm:inline">
              {t("scoreCard.eligibleChecks", { count: report.eligibleChecks })}
            </span>
          )}
          {report.reportUrl ? (
            <a
              className="hover:text-foreground inline-flex items-center gap-1 underline underline-offset-2"
              href={report.reportUrl}
              onClick={() =>
                trackEvent(POSTHOG_EVENTS.AGENT_READINESS_REPORT_OPENED, {
                  report_id: report.id,
                  score,
                })
              }
              rel="noopener noreferrer"
              target="_blank"
            >
              {t("scoreCard.fullReport")}
              <HugeiconsIcon icon={LinkSquare02Icon} size={12} />
            </a>
          ) : null}
        </span>
      }
      variant="table"
    >
      <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:items-center lg:gap-10">
        <div className="flex items-center gap-5">
          {score === null ? null : (
            <AgentReadinessScoreGauge className="size-24" score={score} />
          )}
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h2 className="text-xl font-semibold tracking-tight">
                {band ? t(`band.${band.key}`) : t("scoreCard.noScore")}
              </h2>
              {score === null ? null : (
                <ScoreDelta previousScore={previousScore} score={score} />
              )}
            </div>
            {report.scoreLabel ? (
              <p className="text-muted-foreground text-sm">
                {report.scoreLabel}
              </p>
            ) : null}
            {openPoints === null ? null : (
              <p className="text-muted-foreground text-sm tabular-nums">
                {t("scoreCard.openSummary", {
                  count: report.issues.length,
                  points: format.number(openPoints, {
                    maximumFractionDigits: 1,
                  }),
                })}
              </p>
            )}
          </div>
        </div>
        {breakdown ? (
          <div className="flex flex-col gap-4">
            <TierRow
              label={t("groups.mustDoLabel")}
              tier={breakdown.essential}
            />
            <TierRow
              label={t("groups.shouldDoLabel")}
              tier={breakdown.recommended}
            />
            <p className="text-muted-foreground text-xs tabular-nums">
              {t("scoreCard.bonusSummary", {
                points: format.number(breakdown.bonus.points, {
                  maximumFractionDigits: 1,
                }),
                count: breakdown.bonus.positiveSignals,
              })}
            </p>
          </div>
        ) : null}
      </div>
      <NextStep
        issues={report.issues}
        mustDoOpenPoints={
          breakdown
            ? Math.max(
                0,
                breakdown.essential.available - breakdown.essential.earned
              )
            : 0
        }
        targetUrl={targetUrl}
      />
    </InstrumentModule>
  );
}
