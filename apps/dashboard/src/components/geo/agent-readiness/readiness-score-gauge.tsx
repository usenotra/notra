"use client";

import {
  AGENT_READINESS_BAND_TEXT_CLASS,
  AGENT_READINESS_GAUGE_CIRCUMFERENCE,
  AGENT_READINESS_GAUGE_RADIUS,
  AGENT_READINESS_GAUGE_SIZE,
  AGENT_READINESS_GAUGE_STROKE,
  AGENT_READINESS_MAX_SCORE,
} from "@notra/geo-core/constants/agent-readiness";
import { getAgentReadinessScoreBand } from "@notra/geo-core/utils/agent-readiness";
import { useTranslations } from "use-intl";

import { cn } from "@/lib/utils";
import type { AgentReadinessScoreGaugeProps } from "@/types/agent-readiness";

/** Lighthouse-style circular score ring, colored by band. */
export function AgentReadinessScoreGauge({
  score,
  className,
}: AgentReadinessScoreGaugeProps) {
  const t = useTranslations("geo.agentReadiness");
  const band = getAgentReadinessScoreBand(score);
  const clamped = Math.max(0, Math.min(score, AGENT_READINESS_MAX_SCORE));
  const filled =
    (clamped / AGENT_READINESS_MAX_SCORE) * AGENT_READINESS_GAUGE_CIRCUMFERENCE;

  return (
    <div
      aria-label={t("scoreGauge.ariaLabel", {
        score,
        band: t(`band.${band.key}`),
      })}
      className={cn(
        "relative size-28 shrink-0",
        AGENT_READINESS_BAND_TEXT_CLASS[band.key],
        className
      )}
      role="img"
    >
      <svg
        aria-hidden="true"
        className="size-full -rotate-90"
        viewBox={`0 0 ${AGENT_READINESS_GAUGE_SIZE} ${AGENT_READINESS_GAUGE_SIZE}`}
      >
        <circle
          className="opacity-15"
          cx={AGENT_READINESS_GAUGE_SIZE / 2}
          cy={AGENT_READINESS_GAUGE_SIZE / 2}
          fill="none"
          r={AGENT_READINESS_GAUGE_RADIUS}
          stroke="currentColor"
          strokeWidth={AGENT_READINESS_GAUGE_STROKE}
        />
        <circle
          cx={AGENT_READINESS_GAUGE_SIZE / 2}
          cy={AGENT_READINESS_GAUGE_SIZE / 2}
          fill="none"
          r={AGENT_READINESS_GAUGE_RADIUS}
          stroke="currentColor"
          strokeDasharray={`${filled} ${AGENT_READINESS_GAUGE_CIRCUMFERENCE - filled}`}
          strokeLinecap="round"
          strokeWidth={AGENT_READINESS_GAUGE_STROKE}
          style={{ transition: "stroke-dasharray 600ms ease" }}
        />
      </svg>
      <span className="text-foreground absolute inset-0 flex items-center justify-center text-3xl font-bold tracking-tight tabular-nums">
        {score}
      </span>
    </div>
  );
}
