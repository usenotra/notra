import { useKeyboard, useTerminalDimensions } from "@opentui/react";
import { useState } from "react";

import {
  scoreColor,
  seriesColor,
  theme,
  matrixCellColor,
} from "../../constants/theme";
import type {
  AnySuite,
  ContenderSummary,
  EvalRun,
  TaskResult,
} from "../../types/eval";
import {
  bar,
  histogram,
  pad,
  padStart,
  shade,
  truncate,
  wrapLine,
} from "../../utils/charts";
import {
  confusionMatrix,
  formatMs,
  formatPct,
  formatUsd,
  summarizeRun,
} from "../../utils/stats";
import { Header, KeyHints } from "../components";

type Tab = "overview" | "fields" | "cases" | "errors";
const TABS: readonly Tab[] = ["overview", "fields", "cases", "errors"];

function TabBar({ active }: { active: Tab }) {
  return (
    <box flexDirection="row" gap={1} paddingLeft={1} height={1} flexShrink={0}>
      {TABS.map((tab, index) => (
        <text key={tab}>
          <span
            fg={tab === active ? theme.bg : theme.muted}
            bg={tab === active ? theme.accent : undefined}
          >
            {` ${index + 1} ${tab} `}
          </span>
        </text>
      ))}
    </box>
  );
}

function MetricChart({
  title,
  summaries,
  value,
  format,
  width,
  higherIsBetter,
}: {
  title: string;
  summaries: readonly ContenderSummary[];
  value: (summary: ContenderSummary) => number;
  format: (value: number) => string;
  width: number;
  higherIsBetter: boolean;
}) {
  const values = summaries.map(value);
  const max = Math.max(...values, 0) || 1;
  const valid = values.filter((item) => item > 0);
  const best = higherIsBetter ? Math.max(...valid) : Math.min(...valid);
  const barWidth = Math.max(6, width - 34);
  return (
    <box
      title={` ${title} `}
      border
      borderStyle="rounded"
      borderColor={theme.border}
      flexShrink={0}
      flexDirection="column"
      paddingLeft={1}
      paddingRight={1}
      flexGrow={1}
    >
      {summaries.map((summary, index) => {
        const current = values[index] ?? 0;
        const isBest = current > 0 && current === best && summaries.length > 1;
        return (
          <text key={summary.contenderKey}>
            <span fg={theme.text}>{pad(summary.label, 16)} </span>
            <span fg={seriesColor(index)}>
              {pad(bar(current / max, barWidth), barWidth)}
            </span>
            <span
              fg={isBest ? theme.good : theme.muted}
            >{` ${padStart(format(current), 8)}`}</span>
            <span fg={theme.good}>{isBest ? " ★" : "  "}</span>
          </text>
        );
      })}
    </box>
  );
}

/** Mean score per case tag (content type, expected decision) and contender. */
function TagBreakdown({
  run,
  suite,
  summaries,
}: {
  run: EvalRun;
  suite: AnySuite | undefined;
  summaries: readonly ContenderSummary[];
}) {
  const tagsByCase = new Map(
    (suite?.cases ?? []).map((item) => [item.id, item.tags ?? []])
  );
  const tags = [...new Set([...tagsByCase.values()].flat())];
  if (tags.length === 0) {
    return null;
  }
  const scoreFor = (tag: string, contenderKey: string) => {
    const scores = run.tasks
      .filter(
        (task) =>
          task.contenderKey === contenderKey &&
          task.status === "done" &&
          tagsByCase.get(task.caseId)?.includes(tag)
      )
      .map((task) => task.score?.score ?? 0);
    return scores.length
      ? scores.reduce((sum, value) => sum + value, 0) / scores.length
      : undefined;
  };
  return (
    <box
      title=" Score by tag "
      border
      borderStyle="rounded"
      borderColor={theme.border}
      flexShrink={0}
      flexDirection="column"
      paddingLeft={1}
      paddingRight={1}
    >
      <text>
        <span fg={theme.faint}>{pad("tag", 18)}</span>
        {summaries.map((summary, index) => (
          <span key={summary.contenderKey} fg={seriesColor(index)}>
            {padStart(truncate(summary.label, 14), 18)}
          </span>
        ))}
      </text>
      {tags.map((tag) => (
        <text key={tag}>
          <span fg={theme.text}>{pad(tag, 18)}</span>
          {summaries.map((summary) => {
            const value = scoreFor(tag, summary.contenderKey);
            return (
              <span
                key={summary.contenderKey}
                fg={value === undefined ? theme.faint : scoreColor(value)}
              >
                {padStart(
                  value === undefined
                    ? "–"
                    : `${pad(bar(value, 8), 8)} ${formatPct(value)}`,
                  18
                )}
              </span>
            );
          })}
        </text>
      ))}
    </box>
  );
}

function OverviewTab({
  run,
  suite,
  summaries,
  width,
}: {
  run: EvalRun;
  suite: AnySuite | undefined;
  summaries: readonly ContenderSummary[];
  width: number;
}) {
  const half = Math.floor((width - 4) / 2);
  const maxLatency = Math.max(
    ...summaries.flatMap((item) => item.latencies),
    1
  );
  const histWidth = Math.max(10, Math.min(48, width - 40));
  return (
    <box
      flexDirection="column"
      flexGrow={1}
      gap={0}
      paddingLeft={1}
      paddingRight={1}
      overflow="hidden"
    >
      <box flexDirection="row" gap={1} flexShrink={0}>
        <MetricChart
          title="Score"
          summaries={summaries}
          value={(item) => item.accuracy}
          format={formatPct}
          width={half}
          higherIsBetter
        />
        <MetricChart
          title="Pass rate"
          summaries={summaries}
          value={(item) => item.passRate}
          format={formatPct}
          width={half}
          higherIsBetter
        />
      </box>
      <box flexDirection="row" gap={1} flexShrink={0}>
        <MetricChart
          title="Latency p50"
          summaries={summaries}
          value={(item) => item.p50Ms}
          format={formatMs}
          width={half}
          higherIsBetter={false}
        />
        <MetricChart
          title="Cost (model calls)"
          summaries={summaries}
          value={(item) => item.costUsd}
          format={formatUsd}
          width={half}
          higherIsBetter={false}
        />
      </box>
      <box
        title={` Latency distribution (0 – ${formatMs(maxLatency)}) `}
        border
        borderStyle="rounded"
        borderColor={theme.border}
        flexShrink={0}
        flexDirection="column"
        paddingLeft={1}
        paddingRight={1}
      >
        {summaries.map((summary, index) => {
          const hist = histogram(summary.latencies, histWidth, maxLatency);
          return (
            <text key={summary.contenderKey}>
              <span fg={theme.text}>{pad(summary.label, 16)} </span>
              <span fg={seriesColor(index)}>{hist.line}</span>
              <span fg={theme.muted}>{`  p95 ${formatMs(summary.p95Ms)}`}</span>
            </text>
          );
        })}
      </box>
      <TagBreakdown run={run} suite={suite} summaries={summaries} />
      <box
        title=" Totals "
        border
        borderStyle="rounded"
        borderColor={theme.border}
        flexShrink={0}
        flexDirection="column"
        paddingLeft={1}
        paddingRight={1}
      >
        <text
          fg={theme.faint}
        >{`${pad("model", 18)}${padStart("calls", 8)}${padStart("errors", 8)}${padStart("in tok", 10)}${padStart("out tok", 10)}${padStart("cost", 10)}${padStart("judge", 9)}${padStart("$/pass", 10)}`}</text>
        {summaries.map((summary, index) => (
          <text key={summary.contenderKey}>
            <span fg={seriesColor(index)}>{"■ "}</span>
            <span fg={theme.text}>{pad(summary.label, 16)}</span>
            <span fg={theme.muted}>{padStart(String(summary.total), 8)}</span>
            <span fg={summary.errors ? theme.bad : theme.muted}>
              {padStart(String(summary.errors), 8)}
            </span>
            <span fg={theme.muted}>
              {padStart(summary.inputTokens.toLocaleString("en-US"), 10)}
            </span>
            <span fg={theme.muted}>
              {padStart(summary.outputTokens.toLocaleString("en-US"), 10)}
            </span>
            <span fg={theme.text}>
              {padStart(formatUsd(summary.costUsd), 10)}
            </span>
            <span fg={theme.faint}>
              {padStart(formatUsd(summary.judgeCostUsd), 9)}
            </span>
            <span fg={theme.muted}>
              {padStart(
                summary.passRate > 0
                  ? formatUsd(
                      summary.costUsd / (summary.passRate * summary.done)
                    )
                  : "–",
                10
              )}
            </span>
          </text>
        ))}
      </box>
    </box>
  );
}

function FieldsTab({
  run,
  suite,
  summaries,
  fieldIndex,
  contenderIndex,
}: {
  run: EvalRun;
  suite: AnySuite | undefined;
  summaries: readonly ContenderSummary[];
  fieldIndex: number;
  contenderIndex: number;
}) {
  const fields = [
    ...new Set(summaries.flatMap((item) => Object.keys(item.fieldAccuracy))),
  ];
  const labelFields = (suite?.labelFields ?? []).filter((field) =>
    fields.includes(field)
  );
  const field = labelFields[fieldIndex % Math.max(1, labelFields.length)];
  const contender =
    run.config.contenders[contenderIndex % run.config.contenders.length];
  const matrix =
    field && contender
      ? confusionMatrix(run.tasks, contender.key, field)
      : undefined;
  const cell = 9;

  return (
    <box flexDirection="column" flexGrow={1} paddingLeft={1} paddingRight={1}>
      <box
        title=" Accuracy per field "
        border
        borderStyle="rounded"
        borderColor={theme.border}
        flexDirection="column"
        paddingLeft={1}
        paddingRight={1}
        flexShrink={0}
      >
        <text>
          <span fg={theme.faint}>{pad("field", 18)}</span>
          {summaries.map((summary, index) => (
            <span key={summary.contenderKey} fg={seriesColor(index)}>
              {padStart(truncate(summary.label, 14), 16)}
            </span>
          ))}
        </text>
        {fields.map((name) => (
          <text key={name}>
            <span fg={theme.text}>{pad(name, 18)}</span>
            {summaries.map((summary) => {
              const value = summary.fieldAccuracy[name];
              return (
                <span
                  key={summary.contenderKey}
                  fg={value === undefined ? theme.faint : scoreColor(value)}
                >
                  {padStart(
                    value === undefined
                      ? "–"
                      : `${bar(value, 6).padEnd(6, " ")} ${formatPct(value)}`,
                    16
                  )}
                </span>
              );
            })}
          </text>
        ))}
      </box>
      {matrix && field && contender ? (
        <box
          title={` Confusion: ${field} · ${contender.label} (rows expected, cols actual) `}
          border
          borderStyle="rounded"
          borderColor={theme.border}
          flexDirection="column"
          paddingLeft={1}
          paddingRight={1}
          flexGrow={1}
        >
          <text>
            <span fg={theme.faint}>{pad("", 14)}</span>
            {matrix.labels.map((label) => (
              <span key={label} fg={theme.muted}>
                {padStart(truncate(label, cell - 1), cell)}
              </span>
            ))}
          </text>
          {matrix.labels.map((expected) => (
            <text key={expected}>
              <span fg={theme.muted}>{pad(truncate(expected, 13), 14)}</span>
              {matrix.labels.map((actual) => {
                const count = matrix.counts.get(expected)?.get(actual) ?? 0;
                const isDiagonal = expected === actual;
                const color = matrixCellColor(count, isDiagonal);
                return (
                  <span key={actual} fg={color}>
                    {padStart(
                      count === 0
                        ? "·"
                        : `${shade(count / matrix.max)}${count}`,
                      cell
                    )}
                  </span>
                );
              })}
            </text>
          ))}
        </box>
      ) : (
        <text fg={theme.faint}>
          This suite has no label fields for a confusion matrix.
        </text>
      )}
    </box>
  );
}

function taskMark(task: TaskResult | undefined): {
  mark: string;
  color: string;
} {
  if (!task) {
    return { mark: "·", color: theme.faint };
  }
  if (task.status === "error") {
    return { mark: "!", color: theme.bad };
  }
  if (task.status !== "done") {
    return { mark: "…", color: theme.running };
  }
  const score = task.score?.score ?? 0;
  if (task.score?.pass) {
    return { mark: "✓", color: theme.good };
  }
  return score >= 0.5
    ? { mark: "◐", color: theme.warn }
    : { mark: "✗", color: theme.bad };
}

function CasesTab({
  run,
  suite,
  caseIndex,
  contenderIndex,
  detailScroll,
  height,
  width,
}: {
  run: EvalRun;
  suite: AnySuite | undefined;
  caseIndex: number;
  contenderIndex: number;
  detailScroll: number;
  height: number;
  width: number;
}) {
  const caseIds = [...new Set(run.tasks.map((task) => task.caseId))];
  const listHeight = Math.max(4, height - 8);
  const start = Math.max(
    0,
    Math.min(
      caseIndex - Math.floor(listHeight / 2),
      caseIds.length - listHeight
    )
  );
  const visible = caseIds.slice(start, start + listHeight);
  const selectedCase = caseIds[caseIndex];
  const contender =
    run.config.contenders[contenderIndex % run.config.contenders.length];
  const caseTasks = run.tasks.filter(
    (task) =>
      task.caseId === selectedCase && task.contenderKey === contender?.key
  );
  const caseDef = suite?.cases.find((item) => item.id === selectedCase);
  const listWidth = Math.min(64, Math.floor(width * 0.45));

  const detailLines: { text: string; color: string }[] = [];
  if (caseDef) {
    detailLines.push({ text: caseDef.title, color: theme.text });
    detailLines.push({
      text: `expected: ${JSON.stringify(caseDef.expected)}`,
      color: theme.muted,
    });
  }
  for (const task of caseTasks) {
    detailLines.push({ text: "", color: theme.text });
    detailLines.push({
      text: `run #${task.repeat + 1} · ${task.status} · ${formatMs(task.durationMs ?? 0)} · ${formatUsd(task.costUsd ?? 0)} · score ${task.score ? formatPct(task.score.score) : "–"}`,
      color: task.status === "error" ? theme.bad : theme.accent,
    });
    if (task.error) {
      detailLines.push({ text: task.error, color: theme.bad });
    }
    for (const field of task.score?.fields ?? []) {
      const parts = [
        field.expected !== undefined ? `expected ${field.expected}` : "",
        field.actual !== undefined ? `got ${field.actual}` : "",
        field.note ?? "",
      ].filter(Boolean);
      detailLines.push({
        text: `${field.score >= 0.5 ? "✓" : "✗"} ${pad(field.field, 18)} ${formatPct(field.score).padStart(6)}  ${parts.join(" · ")}`,
        color: scoreColor(field.score),
      });
    }
    if (task.transcript) {
      detailLines.push({ text: "", color: theme.text });
      for (const line of task.transcript.split("\n")) {
        detailLines.push({ text: line, color: theme.muted });
      }
    }
  }
  const detailWidth = Math.max(20, width - listWidth - 8);
  const wrapped = detailLines.flatMap((line) =>
    wrapLine(line.text, detailWidth).map((text) => ({
      text,
      color: line.color,
    }))
  );
  const detailHeight = Math.max(4, height - 8);
  const maxScroll = Math.max(0, wrapped.length - detailHeight);
  const scroll = Math.min(detailScroll, maxScroll);
  const detailVisible = wrapped.slice(scroll, scroll + detailHeight);

  return (
    <box
      flexDirection="row"
      flexGrow={1}
      gap={1}
      paddingLeft={1}
      paddingRight={1}
    >
      <box
        title={` Cases (${caseIds.length}) `}
        border
        borderStyle="rounded"
        borderColor={theme.border}
        flexDirection="column"
        paddingLeft={1}
        paddingRight={1}
        width={listWidth}
      >
        <text>
          <span fg={theme.faint}>{pad("", 2)}</span>
          {run.config.contenders.map((item, index) => (
            <span key={item.key} fg={seriesColor(index)}>
              {index === contenderIndex % run.config.contenders.length
                ? "▼"
                : "■"}
            </span>
          ))}
        </text>
        {visible.map((caseId, offset) => {
          const index = start + offset;
          const active = index === caseIndex;
          return (
            <text key={caseId}>
              <span fg={active ? theme.accent : theme.faint}>
                {active ? "▸ " : "  "}
              </span>
              {run.config.contenders.map((item) => {
                const tasks = run.tasks.filter(
                  (task) =>
                    task.caseId === caseId && task.contenderKey === item.key
                );
                const worst =
                  tasks.find((task) => task.status === "error") ??
                  tasks.find((task) => !task.score?.pass) ??
                  tasks[0];
                const { mark, color } = taskMark(worst);
                return (
                  <span key={item.key} fg={color}>
                    {mark}
                  </span>
                );
              })}
              <span
                fg={active ? theme.text : theme.muted}
              >{` ${truncate(caseId, listWidth - run.config.contenders.length - 8)}`}</span>
            </text>
          );
        })}
      </box>
      <box
        title={` ${contender?.label ?? ""} · ${selectedCase ?? ""} `}
        border
        borderStyle="rounded"
        borderColor={theme.borderFocus}
        flexDirection="column"
        paddingLeft={1}
        paddingRight={1}
        flexGrow={1}
      >
        {detailVisible.map((line, index) => (
          <text key={`${scroll + index}`} fg={line.color}>
            {line.text || " "}
          </text>
        ))}
        {maxScroll > 0 ? (
          <text
            fg={theme.faint}
          >{`── ${scroll + 1}-${Math.min(wrapped.length, scroll + detailHeight)} of ${wrapped.length} lines (space / pgup) ──`}</text>
        ) : null}
      </box>
    </box>
  );
}

function ErrorsTab({ run, width }: { run: EvalRun; width: number }) {
  const groups = new Map<string, TaskResult[]>();
  for (const task of run.tasks) {
    if (task.status !== "error") {
      continue;
    }
    const key = (task.error ?? "unknown").replace(/\d+/g, "#").slice(0, 120);
    groups.set(key, [...(groups.get(key) ?? []), task]);
  }
  const label = new Map(
    run.config.contenders.map((item) => [item.key, item.label])
  );
  if (groups.size === 0) {
    return (
      <box paddingLeft={2} paddingTop={1}>
        <text fg={theme.good}>No errors in this run.</text>
      </box>
    );
  }
  return (
    <box flexDirection="column" flexGrow={1} paddingLeft={1} paddingRight={1}>
      {[...groups.entries()]
        .sort((a, b) => b[1].length - a[1].length)
        .map(([message, tasks]) => (
          <box
            key={message}
            border
            borderStyle="rounded"
            borderColor={theme.bad}
            flexDirection="column"
            paddingLeft={1}
            paddingRight={1}
            title={` ${tasks.length}× `}
          >
            <text fg={theme.bad} wrapMode="word">
              {tasks[0]?.error ?? message}
            </text>
            <text fg={theme.muted}>
              {truncate(
                [
                  ...new Set(
                    tasks.map(
                      (task) =>
                        `${label.get(task.contenderKey) ?? task.contenderKey}/${task.caseId}`
                    )
                  ),
                ].join(", "),
                width - 8
              )}
            </text>
          </box>
        ))}
    </box>
  );
}

export function ResultsScreen({
  run,
  suite,
  demo,
  onBack,
  onRetry,
}: {
  run: EvalRun;
  suite: AnySuite | undefined;
  demo: boolean;
  onBack: () => void;
  onRetry?: () => void;
}) {
  const { width, height } = useTerminalDimensions();
  const [tab, setTab] = useState<Tab>("overview");
  const [fieldIndex, setFieldIndex] = useState(0);
  const [contenderIndex, setContenderIndex] = useState(0);
  const [caseIndex, setCaseIndex] = useState(0);
  const [detailScroll, setDetailScroll] = useState(0);
  const summaries = summarizeRun(run);
  const caseCount = new Set(run.tasks.map((task) => task.caseId)).size;
  const contenderCount = run.config.contenders.length;
  const errorCount = run.tasks.filter((task) => task.status === "error").length;

  useKeyboard((key) => {
    const numeric = Number(key.name);
    if (numeric >= 1 && numeric <= TABS.length) {
      setTab(TABS[numeric - 1] ?? "overview");
      return;
    }
    switch (key.name) {
      case "tab":
        setTab(
          (current) =>
            TABS[(TABS.indexOf(current) + 1) % TABS.length] ?? "overview"
        );
        return;
      case "escape":
      case "b":
        onBack();
        return;
      case "r":
        if (errorCount > 0 && run.status !== "running") {
          onRetry?.();
        }
        return;
      case "f":
        setFieldIndex((value) => value + 1);
        return;
      case "m":
      case "right":
      case "l":
        setContenderIndex((value) => (value + 1) % contenderCount);
        setDetailScroll(0);
        return;
      case "left":
      case "h":
        setContenderIndex(
          (value) => (value - 1 + contenderCount) % contenderCount
        );
        setDetailScroll(0);
        return;
      case "up":
      case "k":
        setCaseIndex((value) => Math.max(0, value - 1));
        setDetailScroll(0);
        return;
      case "down":
      case "j":
        setCaseIndex((value) => Math.min(caseCount - 1, value + 1));
        setDetailScroll(0);
        return;
      case "pagedown":
      case "space":
        setDetailScroll((value) => value + Math.max(4, height - 12));
        return;
      case "pageup":
        setDetailScroll((value) =>
          Math.max(0, value - Math.max(4, height - 12))
        );
        return;
      default:
    }
  });

  return (
    <box
      flexDirection="column"
      width="100%"
      height="100%"
      backgroundColor={theme.bg}
    >
      <Header
        title={`${run.suiteName} · results`}
        subtitle={`${run.id} · ${run.status}`}
        demo={demo}
      />
      <TabBar active={tab} />
      <box flexGrow={1} flexDirection="column">
        {tab === "overview" ? (
          <OverviewTab
            run={run}
            suite={suite}
            summaries={summaries}
            width={width}
          />
        ) : null}
        {tab === "fields" ? (
          <FieldsTab
            run={run}
            suite={suite}
            summaries={summaries}
            fieldIndex={fieldIndex}
            contenderIndex={contenderIndex}
          />
        ) : null}
        {tab === "cases" ? (
          <CasesTab
            run={run}
            suite={suite}
            caseIndex={caseIndex}
            contenderIndex={contenderIndex}
            detailScroll={detailScroll}
            height={height}
            width={width}
          />
        ) : null}
        {tab === "errors" ? <ErrorsTab run={run} width={width} /> : null}
      </box>
      <KeyHints
        hints={[
          { keys: "1-4/tab", label: "view" },
          ...(tab === "fields"
            ? [
                { keys: "f", label: "field" },
                { keys: "m", label: "model" },
              ]
            : []),
          ...(tab === "cases"
            ? [
                { keys: "↑↓", label: "case" },
                { keys: "←→", label: "model" },
                { keys: "space/pgup", label: "scroll" },
              ]
            : []),
          ...(errorCount > 0 && run.status !== "running"
            ? [{ keys: "r", label: `retry ${errorCount} errors` }]
            : []),
          { keys: "b", label: "back" },
        ]}
      />
    </box>
  );
}
