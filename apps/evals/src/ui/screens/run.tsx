import { useKeyboard, useTerminalDimensions } from "@opentui/react";
import { useEffect, useState } from "react";

import {
  runStatusColor,
  scoreColor,
  seriesColor,
  theme,
} from "../../constants/theme";
import type { EvalRun } from "../../types/eval";
import { pad, padStart, sparkline, truncate } from "../../utils/charts";
import {
  formatMs,
  formatPct,
  formatUsd,
  summarizeRun,
} from "../../utils/stats";
import { Header, KeyHints, ProgressBar } from "../components";

const SPINNER = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

function elapsed(now: number, from: string, to?: string): string {
  const ms = (to ? Date.parse(to) : now) - Date.parse(from);
  const seconds = Math.floor(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export function RunScreen({
  run,
  demo,
  onCancel,
  onResults,
  onBack,
}: {
  run: EvalRun;
  demo: boolean;
  onCancel: () => void;
  onResults: () => void;
  onBack: () => void;
}) {
  const { width, height } = useTerminalDimensions();
  const [tick, setTick] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const isRunning = run.status === "running";

  useEffect(() => {
    if (!isRunning) {
      return;
    }
    const timer = setInterval(() => {
      setTick((value) => value + 1);
      setNow(Date.now());
    }, 120);
    return () => clearInterval(timer);
  }, [isRunning]);

  useKeyboard((key) => {
    if (key.name === "c" || (key.name === "escape" && isRunning)) {
      onCancel();
      return;
    }
    if (key.name === "return" || key.name === "v") {
      onResults();
      return;
    }
    if (key.name === "escape" || key.name === "b") {
      onBack();
    }
  });

  const summaries = summarizeRun(run);
  const total = run.tasks.length;
  const done = run.tasks.filter((task) => task.status === "done").length;
  const errors = run.tasks.filter((task) => task.status === "error").length;
  const running = run.tasks.filter((task) => task.status === "running");
  const totalCost = summaries.reduce(
    (sum, item) => sum + item.costUsd + item.judgeCostUsd,
    0
  );
  const barWidth = Math.max(10, Math.min(36, width - 90));
  const labelWidth = 22;
  const recentErrors = run.tasks
    .filter((task) => task.status === "error")
    .slice(-Math.max(3, height - 24));
  const spinner = SPINNER[tick % SPINNER.length] ?? "·";
  const contenderLabel = new Map(
    run.config.contenders.map((item) => [item.key, item.label])
  );
  const statusColor = runStatusColor(run.status);

  return (
    <box
      flexDirection="column"
      width="100%"
      height="100%"
      backgroundColor={theme.bg}
    >
      <Header title={run.suiteName} subtitle={run.id} demo={demo} />

      <box
        border
        borderStyle="rounded"
        borderColor={theme.border}
        flexDirection="column"
        paddingLeft={1}
        paddingRight={1}
        marginLeft={1}
        marginRight={1}
        flexShrink={0}
      >
        <box flexDirection="row" justifyContent="space-between">
          <text>
            <span fg={statusColor}>
              {isRunning ? `${spinner} running` : `● ${run.status}`}
            </span>
            <span fg={theme.muted}>{`   ${done + errors}/${total} calls`}</span>
            <span fg={theme.muted}>{`   ${running.length} in flight`}</span>
            <span
              fg={errors ? theme.bad : theme.muted}
            >{`   ${errors} errors`}</span>
          </text>
          <text>
            <span fg={theme.muted}>elapsed </span>
            <span fg={theme.text}>
              {elapsed(now, run.createdAt, run.finishedAt)}
            </span>
            <span fg={theme.muted}> spend </span>
            <span fg={theme.text}>{formatUsd(totalCost)}</span>
          </text>
        </box>
        <ProgressBar
          done={done}
          errors={errors}
          total={total}
          width={Math.max(10, width - 8)}
          color={theme.accent}
        />
      </box>

      <box
        title=" Models "
        border
        borderStyle="rounded"
        borderColor={theme.border}
        flexDirection="column"
        paddingLeft={1}
        paddingRight={1}
        marginLeft={1}
        marginRight={1}
        flexShrink={0}
      >
        <text fg={theme.faint}>
          {`${pad("", 2)}${pad("model", labelWidth)} ${pad("progress", barWidth)}  ${padStart("done", 7)} ${padStart("err", 4)} ${padStart("score", 7)} ${padStart("pass", 6)} ${padStart("p50", 7)} ${padStart("p95", 7)} ${padStart("cost", 8)}  latency`}
        </text>
        {summaries.map((summary, index) => (
          <box key={summary.contenderKey} flexDirection="row">
            <text>
              <span fg={seriesColor(index)}>{"■ "}</span>
              <span fg={theme.text}>{pad(summary.label, labelWidth)} </span>
            </text>
            <ProgressBar
              done={summary.done}
              errors={summary.errors}
              total={summary.total}
              width={barWidth}
              color={seriesColor(index)}
            />
            <text>
              <span
                fg={theme.muted}
              >{`  ${padStart(`${summary.done}/${summary.total}`, 7)}`}</span>
              <span
                fg={summary.errors ? theme.bad : theme.faint}
              >{` ${padStart(String(summary.errors), 4)}`}</span>
              <span
                fg={summary.done ? scoreColor(summary.accuracy) : theme.faint}
              >{` ${padStart(summary.done ? formatPct(summary.accuracy) : "–", 7)}`}</span>
              <span
                fg={theme.muted}
              >{` ${padStart(summary.done ? formatPct(summary.passRate) : "–", 6)}`}</span>
              <span
                fg={theme.text}
              >{` ${padStart(formatMs(summary.p50Ms), 7)}`}</span>
              <span
                fg={theme.muted}
              >{` ${padStart(formatMs(summary.p95Ms), 7)}`}</span>
              <span
                fg={theme.muted}
              >{` ${padStart(formatUsd(summary.costUsd), 8)}`}</span>
              <span
                fg={seriesColor(index)}
              >{`  ${sparkline(summary.latencies, 14)}`}</span>
            </text>
          </box>
        ))}
      </box>

      <box
        flexDirection="row"
        flexGrow={1}
        gap={1}
        marginLeft={1}
        marginRight={1}
      >
        <box
          title=" In flight "
          border
          borderStyle="rounded"
          borderColor={theme.border}
          flexDirection="column"
          paddingLeft={1}
          paddingRight={1}
          width="40%"
        >
          {running.length === 0 ? (
            <text fg={theme.faint}>
              {isRunning ? "Waiting for a free slot…" : "Nothing running."}
            </text>
          ) : (
            running.slice(0, Math.max(1, height - 22)).map((task) => (
              <text key={`${task.contenderKey}:${task.caseId}:${task.repeat}`}>
                <span fg={theme.running}>{`${spinner} `}</span>
                <span fg={theme.text}>
                  {pad(
                    contenderLabel.get(task.contenderKey) ?? task.contenderKey,
                    16
                  )}
                </span>
                <span fg={theme.muted}>{`${pad(task.caseId, 28)} `}</span>
                <span fg={theme.faint}>
                  {formatMs(now - (task.startedAt ?? now))}
                </span>
              </text>
            ))
          )}
        </box>
        <box
          title={` Errors (${errors}) `}
          border
          borderStyle="rounded"
          borderColor={errors ? theme.bad : theme.border}
          flexDirection="column"
          paddingLeft={1}
          paddingRight={1}
          flexGrow={1}
        >
          {recentErrors.length === 0 ? (
            <text fg={theme.faint}>No errors so far.</text>
          ) : (
            recentErrors.map((task) => (
              <text key={`${task.contenderKey}:${task.caseId}:${task.repeat}`}>
                <span fg={theme.bad}>{"✗ "}</span>
                <span fg={theme.text}>
                  {pad(
                    contenderLabel.get(task.contenderKey) ?? task.contenderKey,
                    14
                  )}
                </span>
                <span fg={theme.muted}>{pad(task.caseId, 22)}</span>
                <span fg={theme.bad}>
                  {truncate(
                    task.error ?? "",
                    Math.max(10, Math.floor(width * 0.6) - 44)
                  )}
                </span>
              </text>
            ))
          )}
        </box>
      </box>

      <KeyHints
        hints={
          isRunning
            ? [
                { keys: "c", label: "cancel run" },
                { keys: "v", label: "live results" },
              ]
            : [
                { keys: "enter", label: "results" },
                { keys: "b", label: "back to suites" },
              ]
        }
      />
    </box>
  );
}
