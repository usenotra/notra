"use client";

import {
  ArrowDown01Icon,
  ArrowUp01Icon,
  LinkSquare02Icon,
  Refresh01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  AGENT_READINESS_MAX_SCORE,
  AGENT_READINESS_MUST_DO_LABEL,
  AGENT_READINESS_SHOULD_DO_LABEL,
} from "@notra/geo-core/constants/agent-readiness";
import {
  formatAgentReadinessDate,
  getAgentReadinessScoreBand,
} from "@notra/geo-core/utils/agent-readiness";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import type { CSSProperties } from "react";

import { Button } from "@/components/button";
import { AgentReadinessScoreGauge } from "@/components/geo/agent-readiness/readiness-score-gauge";
import { InstrumentModule } from "@/components/instrument/instrument-module";
import { trackEvent } from "@/lib/analytics/posthog-client";
import { cn } from "@/lib/utils";
import type {
  AgentReadinessBreakdownTileProps,
  AgentReadinessScoreCardProps,
  AgentReadinessScoreDeltaProps,
} from "@/types/agent-readiness";

function ScoreDelta({ score, previousScore }: AgentReadinessScoreDeltaProps) {
  if (previousScore === null || previousScore === score) {
    return null;
  }
  const delta = score - previousScore;
  const improved = delta > 0;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium tabular-nums",
        improved
          ? "bg-success/10 text-success"
          : "bg-destructive/10 text-destructive"
      )}
    >
      <HugeiconsIcon
        icon={improved ? ArrowUp01Icon : ArrowDown01Icon}
        size={12}
      />
      {improved ? "+" : ""}
      {delta} since last scan
    </span>
  );
}

function passingPercent(passing: number, total: number): number {
  if (total <= 0) {
    return 0;
  }
  return Math.min(100, (passing / total) * 100);
}

function BreakdownTile({
  label,
  value,
  hint,
  passing,
  total,
}: AgentReadinessBreakdownTileProps) {
  const showBar = passing !== undefined && total !== undefined && total > 0;

  return (
    <div className="bg-muted/40 flex min-w-0 flex-col gap-2 rounded-xl px-4 py-3">
      <span className="text-muted-foreground text-xs font-medium">{label}</span>
      <span className="text-lg font-semibold tracking-tight tabular-nums">
        {value}
      </span>
      {showBar ? (
        <div
          aria-label={`${passing} of ${total} ${label} checks passing`}
          aria-valuemax={total}
          aria-valuemin={0}
          aria-valuenow={passing}
          className="bg-muted-foreground/15 h-1.5 overflow-hidden rounded-full"
          role="progressbar"
        >
          <div
            className="bg-foreground/70 duration-slower transition-width h-full w-(--passing) rounded-full ease-out"
            style={
              {
                "--passing": `${passingPercent(passing, total)}%`,
              } as CSSProperties
            }
          />
        </div>
      ) : null}
      <span className="text-muted-foreground text-xs">{hint}</span>
    </div>
  );
}

export function AgentReadinessScoreCard({
  report,
  previousScore,
  isScanning,
  onRescan,
}: AgentReadinessScoreCardProps) {
  const breakdown = report.scoreBreakdown;
  const score = report.score;
  const band = score !== null ? getAgentReadinessScoreBand(score) : null;

  return (
    <InstrumentModule
      action={
        <Button
          disabled={isScanning}
          onClick={onRescan}
          size="sm"
          variant="outline"
        >
          <HugeiconsIcon icon={Refresh01Icon} size={16} />
          {isScanning ? "Scanning…" : "Rescan"}
        </Button>
      }
      bodyClassName="gap-6 p-6"
      eyebrow="Readiness score"
      variant="table"
    >
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:gap-8">
        <div className="flex shrink-0 items-center gap-6">
          {score !== null ? <AgentReadinessScoreGauge score={score} /> : null}

          <div className="flex min-w-0 flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-semibold tracking-tight">
                {band?.label ?? "No score yet"}
              </h2>
              {score !== null ? (
                <ScoreDelta previousScore={previousScore} score={score} />
              ) : null}
            </div>
            {report.scoreLabel ? (
              <p className="text-muted-foreground">{report.scoreLabel}</p>
            ) : null}
            {score !== null ? (
              <p className="text-muted-foreground text-sm tabular-nums">
                {score} / {AGENT_READINESS_MAX_SCORE}
              </p>
            ) : null}
          </div>
        </div>

        {breakdown ? (
          <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-3">
            <BreakdownTile
              hint="checks passing"
              label={AGENT_READINESS_MUST_DO_LABEL}
              passing={breakdown.essential.passing}
              total={breakdown.essential.total}
              value={`${breakdown.essential.passing} / ${breakdown.essential.total}`}
            />
            <BreakdownTile
              hint="checks passing"
              label={AGENT_READINESS_SHOULD_DO_LABEL}
              passing={breakdown.recommended.passing}
              total={breakdown.recommended.total}
              value={`${breakdown.recommended.passing} / ${breakdown.recommended.total}`}
            />
            <BreakdownTile
              hint={`${breakdown.bonus.positiveSignals} extra signals`}
              label="Bonus"
              value={`+${breakdown.bonus.points}`}
            />
          </div>
        ) : null}
      </div>

      <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 border-t pt-4 text-sm">
        {report.scannedAt ? (
          <span>Scanned {formatAgentReadinessDate(report.scannedAt)}</span>
        ) : null}
        {report.eligibleChecks !== null ? (
          <span>{report.eligibleChecks} eligible checks</span>
        ) : null}
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
            Full report on is-agentic.com
            <HugeiconsIcon icon={LinkSquare02Icon} size={14} />
          </a>
        ) : null}
      </div>
    </InstrumentModule>
  );
}
