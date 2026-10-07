"use client";

import {
  CheckmarkCircle02Icon,
  CircleIcon,
  MinusSignCircleIcon,
  ServerStack01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Badge } from "@notra/ui/components/ui/badge";
import { Spinner } from "@notra/ui/components/ui/spinner";
import { TitleCard } from "@notra/ui/components/ui/title-card";
import { cn } from "@notra/ui/lib/utils";
import { useEffect, useRef } from "react";

import {
  CODE_RESEARCH_AGENT_CLASSNAMES,
  CODE_RESEARCH_AGENT_LABELS,
  CODE_RESEARCH_DEMO_REDIS_KEY,
  CODE_RESEARCH_PHASE_LABELS,
  CODE_RESEARCH_REDIS_LABELS,
} from "@/constants/design-system-code-research";
import type {
  CodeResearchBoxPhase,
  CodeResearchPlaybackState,
  CodeResearchStage,
} from "@/types/design-system/code-research";

const PHASE_BADGE_VARIANTS: Record<
  CodeResearchBoxPhase,
  "outline" | "info" | "success" | "warning" | "destructive"
> = {
  none: "outline",
  creating: "info",
  cloning: "info",
  checkout: "info",
  ready: "success",
  expired: "warning",
  disabled: "destructive",
};

const MS_PER_SECOND = 1000;

function formatMs(ms: number | undefined) {
  if (ms === undefined) {
    return null;
  }
  if (ms < MS_PER_SECOND) {
    return `${String(ms)} ms`;
  }
  return `${(ms / MS_PER_SECOND).toFixed(1).replace(".", ",")} s`;
}

function StageIcon({ status }: { status: CodeResearchStage["status"] }) {
  if (status === "done") {
    return (
      <HugeiconsIcon
        aria-hidden
        className="text-success size-4 shrink-0"
        icon={CheckmarkCircle02Icon}
      />
    );
  }
  if (status === "running") {
    return <Spinner className="text-info" />;
  }
  if (status === "skipped") {
    return (
      <HugeiconsIcon
        aria-hidden
        className="text-muted-foreground/50 size-4 shrink-0"
        icon={MinusSignCircleIcon}
      />
    );
  }
  return (
    <HugeiconsIcon
      aria-hidden
      className="text-muted-foreground/40 size-4 shrink-0"
      icon={CircleIcon}
    />
  );
}

function Fact({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex min-w-0 items-baseline justify-between gap-3 text-sm">
      <dt className="text-muted-foreground shrink-0">{label}</dt>
      <dd
        className={cn(
          "min-w-0 truncate text-right font-mono text-xs",
          !value && "text-muted-foreground/60"
        )}
        title={value ?? undefined}
      >
        {value ?? "–"}
      </dd>
    </div>
  );
}

export function CodeResearchSandboxPanel({
  state,
}: {
  state: CodeResearchPlaybackState;
}) {
  const { sandbox, explanation, log } = state;
  const logRef = useRef<HTMLOListElement | null>(null);
  const hasStageActivity = sandbox.stages.some(
    (stage) => stage.status !== "pending"
  );

  useEffect(() => {
    const list = logRef.current;
    if (list && log.length > 0) {
      list.scrollTop = list.scrollHeight;
    }
  }, [log.length]);

  return (
    <div className="flex flex-col gap-4">
      <TitleCard heading="Was passiert gerade?">
        {explanation ? (
          <div className="space-y-1.5" aria-live="polite">
            <p className="text-sm font-medium">{explanation.title}</p>
            <p className="text-muted-foreground text-sm text-pretty">
              {explanation.body}
            </p>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            Drück Play oder Weiter, um den Ablauf Schritt für Schritt zu sehen.
          </p>
        )}
      </TitleCard>

      <TitleCard
        action={
          <Badge variant={PHASE_BADGE_VARIANTS[sandbox.phase]}>
            {CODE_RESEARCH_PHASE_LABELS[sandbox.phase]}
          </Badge>
        }
        heading="Upstash Box"
        icon={<HugeiconsIcon aria-hidden icon={ServerStack01Icon} />}
      >
        <dl className="space-y-1.5">
          <Fact label="Box-ID" value={sandbox.boxId} />
          <Fact label="Ausgecheckt" value={sandbox.checkedOut} />
          <Fact label="HEAD" value={sandbox.headSha?.slice(0, 12) ?? null} />
          <Fact label="Läuft ab" value={sandbox.expiresLabel} />
          <Fact
            label="Ausgeführte Befehle"
            value={sandbox.execCount > 0 ? String(sandbox.execCount) : null}
          />
          <Fact label="Netzwerk" value="nur github.com" />
          <Fact label="GitHub-Token" value="contents: read · 1 Repo · Proxy" />
        </dl>
        <div className="border-border/60 mt-3 space-y-1 border-t pt-3">
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="text-muted-foreground">Redis</span>
            <Badge variant={sandbox.redis === "hit" ? "success" : "outline"}>
              {CODE_RESEARCH_REDIS_LABELS[sandbox.redis]}
            </Badge>
          </div>
          <p
            className="text-muted-foreground truncate font-mono text-xs"
            title={CODE_RESEARCH_DEMO_REDIS_KEY}
          >
            {CODE_RESEARCH_DEMO_REDIS_KEY}
          </p>
        </div>
      </TitleCard>

      <TitleCard heading="open_repository intern">
        {hasStageActivity ? (
          <ol className="space-y-2">
            {sandbox.stages.map((stage) => (
              <li
                className={cn(
                  "flex items-start gap-2.5 transition-opacity",
                  stage.status === "skipped" && "opacity-60"
                )}
                key={stage.id}
              >
                <span className="mt-0.5">
                  <StageIcon status={stage.status} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span
                      className={cn(
                        "text-sm",
                        stage.status === "skipped" && "line-through"
                      )}
                    >
                      {stage.label}
                    </span>
                    <span className="text-muted-foreground shrink-0 font-mono text-xs tabular-nums">
                      {formatMs(stage.realMs)}
                    </span>
                  </div>
                  <p className="text-muted-foreground text-xs text-pretty">
                    {stage.detail}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-muted-foreground text-sm">
            {sandbox.phase === "disabled"
              ? "Mit ausgeschaltetem Flag läuft keine dieser Stufen."
              : "Noch nicht aufgerufen. Die Box entsteht erst beim ersten open_repository."}
          </p>
        )}
      </TitleCard>

      <TitleCard heading="Event-Log">
        <ol className="max-h-72 space-y-1.5 overflow-y-auto pr-1" ref={logRef}>
          {log.length === 0 ? (
            <li className="text-muted-foreground text-sm">Noch leer.</li>
          ) : (
            log.map((entry) => (
              <li
                className="flex items-start gap-2 text-sm"
                key={`${String(entry.step)}-${entry.label}`}
              >
                <span
                  className={cn(
                    "mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-xs font-medium",
                    CODE_RESEARCH_AGENT_CLASSNAMES[entry.agent]
                  )}
                >
                  {CODE_RESEARCH_AGENT_LABELS[entry.agent]}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="min-w-0 truncate">{entry.label}</span>
                    <span className="text-muted-foreground shrink-0 font-mono text-xs tabular-nums">
                      {formatMs(entry.realMs)}
                    </span>
                  </div>
                  {entry.detail ? (
                    <p className="text-muted-foreground text-xs">
                      {entry.detail}
                    </p>
                  ) : null}
                </div>
              </li>
            ))
          )}
        </ol>
      </TitleCard>
    </div>
  );
}
