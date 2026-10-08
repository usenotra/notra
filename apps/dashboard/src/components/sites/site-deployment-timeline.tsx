"use client";

import {
  Cancel01Icon,
  CheckmarkCircle02Icon,
  Loading03Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { CSSProperties } from "react";
import { useMemo } from "react";
import { useLocale, useTranslations } from "use-intl";

import { useNow } from "@/lib/hooks/use-now";
import { cn } from "@/lib/utils";
import type { SiteDeploymentTimelineProps } from "@/types/components/sites";
import {
  deploymentTimelinePhases,
  formatDeploymentPhaseDuration,
} from "@/utils/site-deployment-timeline";
import { isDeploymentInProgress } from "@/utils/site-deployments";

export function SiteDeploymentTimeline({
  deployment,
  log,
}: SiteDeploymentTimelineProps) {
  const t = useTranslations("sites.deploymentPage.timeline");
  const locale = useLocale();
  const running = isDeploymentInProgress(deployment.status);
  const now = useNow(running);
  const time = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }),
    [locale]
  );
  const phases = useMemo(
    () =>
      deploymentTimelinePhases(deployment, log, now).map((phase) => ({
        ...phase,
        duration: formatDeploymentPhaseDuration(phase.durationMs, locale),
        startIso:
          phase.startedAt !== null
            ? new Date(phase.startedAt).toISOString()
            : null,
        startLabel:
          phase.startedAt !== null ? time.format(phase.startedAt) : null,
      })),
    [deployment, log, now, locale, time]
  );

  return (
    <section aria-label={t("title")} className="space-y-3">
      <h2 className="text-sm font-medium">{t("title")}</h2>
      <div className="overflow-x-auto pb-1">
        <ol className="flex min-w-xl gap-2">
          {phases.map((phase) => {
            const duration = phase.duration;
            const label = t(`phases.${phase.id}`);
            const state = t(`states.${phase.state}`);
            let icon = null;
            if (phase.state === "active") {
              icon = Loading03Icon;
            } else if (phase.state === "complete") {
              icon = CheckmarkCircle02Icon;
            } else if (phase.state === "failed" || phase.state === "stopped") {
              icon = Cancel01Icon;
            }
            return (
              <li
                aria-current={phase.state === "active" ? "step" : undefined}
                aria-label={`${label} · ${state}${duration ? ` · ${duration}` : ""}`}
                className="min-w-24 grow-(--phase-duration) basis-0 space-y-1.5"
                data-phase={phase.id}
                data-state={phase.state}
                key={phase.id}
                style={
                  {
                    "--phase-duration": Math.max(phase.durationMs ?? 0, 1),
                  } as CSSProperties
                }
              >
                <div className="text-muted-foreground truncate text-xs">
                  {label}
                </div>
                <div
                  className={cn(
                    "bg-muted/40 text-muted-foreground relative isolate flex h-8 items-center justify-end gap-2 overflow-hidden rounded-md border px-2 inset-shadow-sm inset-shadow-white/15 before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:bg-[repeating-linear-gradient(135deg,currentColor_0px,currentColor_3px,transparent_3px,transparent_8px)] before:opacity-15",
                    phase.state === "complete" &&
                      "border-geo-up/30 bg-geo-up/5 text-geo-up",
                    (phase.state === "active" || phase.state === "stopped") &&
                      "border-warning/30 bg-warning/5 text-warning",
                    phase.state === "failed" &&
                      "border-destructive/40 bg-destructive/5 text-destructive"
                  )}
                >
                  <span
                    className="text-muted-foreground font-mono text-xs tabular-nums"
                    title={duration ?? t("timingUnavailable")}
                  >
                    {duration ?? "–"}
                  </span>
                  {icon ? (
                    <HugeiconsIcon
                      aria-hidden="true"
                      className={cn(
                        "size-3.5 shrink-0",
                        phase.state === "active" &&
                          "text-warning motion-safe:animate-spin",
                        phase.state === "complete" && "text-geo-up",
                        phase.state === "failed" && "text-destructive",
                        phase.state === "stopped" && "text-warning"
                      )}
                      icon={icon}
                    />
                  ) : null}
                </div>
                <div className="text-muted-foreground min-h-4 font-mono text-xs tabular-nums">
                  {phase.startIso !== null ? (
                    // Local time: the server renders in its own zone first.
                    <time
                      dateTime={phase.startIso}
                      suppressHydrationWarning
                      title={phase.startIso}
                    >
                      {phase.startLabel}
                    </time>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
