import { useKeyboard, useTerminalDimensions } from "@opentui/react";
import { useState } from "react";

import { runStatusColor, scoreColor, theme } from "../../constants/theme";
import type { EvalRun } from "../../types/eval";
import { pad, padStart, truncate } from "../../utils/charts";
import {
  formatPct,
  formatUsd,
  summarizeRun,
  totalRunCost,
} from "../../utils/stats";
import { Header, KeyHints } from "../components";

export function HistoryScreen({
  runs,
  demo,
  onOpen,
  onBack,
}: {
  runs: readonly EvalRun[];
  demo: boolean;
  onOpen: (run: EvalRun) => void;
  onBack: () => void;
}) {
  const { width, height } = useTerminalDimensions();
  const [index, setIndex] = useState(0);
  const listHeight = Math.max(4, height - 6);
  const start = Math.max(
    0,
    Math.min(index - Math.floor(listHeight / 2), runs.length - listHeight)
  );

  useKeyboard((key) => {
    switch (key.name) {
      case "up":
      case "k":
        setIndex((value) => Math.max(0, value - 1));
        return;
      case "down":
      case "j":
        setIndex((value) => Math.min(runs.length - 1, value + 1));
        return;
      case "return": {
        const run = runs[index];
        if (run) {
          onOpen(run);
        }
        return;
      }
      case "escape":
      case "b":
        onBack();
        return;
      default:
    }
  });

  const bestWidth = Math.max(20, width - 106);

  return (
    <box
      flexDirection="column"
      width="100%"
      height="100%"
      backgroundColor={theme.bg}
    >
      <Header
        title="History"
        subtitle={`${runs.length} saved runs in apps/evals/.runs`}
        demo={demo}
      />
      <box
        border
        borderStyle="rounded"
        borderColor={theme.border}
        flexDirection="column"
        paddingLeft={1}
        paddingRight={1}
        marginLeft={1}
        marginRight={1}
        flexGrow={1}
      >
        <text fg={theme.faint}>
          {`  ${pad("when", 18)}${pad("suite", 32)}${pad("mode", 6)}${pad("status", 11)}${padStart("calls", 6)}${padStart("err", 5)}${padStart("spend", 9)}  ${pad("best model", bestWidth)}`}
        </text>
        {runs.length === 0 ? (
          <text fg={theme.faint}>
            No runs yet. Start one from the suites screen.
          </text>
        ) : null}
        {runs.slice(start, start + listHeight).map((run, offset) => {
          const active = start + offset === index;
          const summaries = summarizeRun(run);
          const best = [...summaries].sort(
            (a, b) => b.accuracy - a.accuracy
          )[0];
          const errors = run.tasks.filter(
            (task) => task.status === "error"
          ).length;
          const spend = totalRunCost(summaries);
          const when = run.createdAt.replace("T", " ").slice(0, 16);
          const statusColor = runStatusColor(run.status);
          return (
            <text key={run.id}>
              <span fg={active ? theme.accent : theme.faint}>
                {active ? "▸ " : "  "}
              </span>
              <span fg={theme.muted}>{pad(when, 18)}</span>
              <span fg={active ? theme.text : theme.muted}>
                {pad(run.suiteName, 32)}
              </span>
              <span fg={run.config.demo ? theme.warn : theme.good}>
                {pad(run.config.demo ? "demo" : "live", 6)}
              </span>
              <span fg={statusColor}>{pad(run.status, 11)}</span>
              <span fg={theme.muted}>
                {padStart(String(run.tasks.length), 6)}
              </span>
              <span fg={errors ? theme.bad : theme.faint}>
                {padStart(String(errors), 5)}
              </span>
              <span fg={theme.muted}>{padStart(formatUsd(spend), 9)}</span>
              <span fg={best ? scoreColor(best.accuracy) : theme.faint}>
                {`  ${truncate(best ? `${best.label} ${formatPct(best.accuracy)}` : "–", bestWidth)}`}
              </span>
            </text>
          );
        })}
      </box>
      <KeyHints
        hints={[
          { keys: "↑↓", label: "move" },
          { keys: "enter", label: "open" },
          { keys: "b", label: "back" },
        ]}
      />
    </box>
  );
}
