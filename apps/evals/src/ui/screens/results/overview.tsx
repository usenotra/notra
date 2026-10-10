import { scoreColor, seriesColor, theme } from "../../../constants/theme";
import type { AnySuite, ContenderSummary, EvalRun } from "../../../types/eval";
import { bar, histogram, pad, padStart, truncate } from "../../../utils/charts";
import { formatMs, formatPct, formatUsd } from "../../../utils/stats";

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
  value: (summary: ContenderSummary) => number | undefined;
  format: (value: number) => string;
  width: number;
  higherIsBetter: boolean;
}) {
  const values = summaries.map(value);
  const known = values.filter(
    (item): item is number => item !== undefined && Number.isFinite(item)
  );
  const max = Math.max(...known, 0) || 1;
  const valid = known.filter((item) => item > 0);
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
        const current = values[index];
        const isBest =
          current !== undefined &&
          current > 0 &&
          current === best &&
          summaries.length > 1;
        return (
          <text key={summary.contenderKey}>
            <span fg={theme.text}>{pad(summary.label, 16)} </span>
            <span fg={seriesColor(index)}>
              {pad(
                current === undefined ? "" : bar(current / max, barWidth),
                barWidth
              )}
            </span>
            <span
              fg={isBest ? theme.good : theme.muted}
            >{` ${padStart(current === undefined ? "–" : format(current), 8)}`}</span>
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

export function OverviewTab({
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
        >{`${pad("model", 18)}${padStart("calls", 8)}${padStart("errors", 8)}${padStart("in tok", 10)}${padStart("out tok", 10)}${padStart("cost", 10)} ${pad("source", 10)}${padStart("judge", 9)} ${pad("source", 10)}${padStart("$/pass", 10)}`}</text>
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
            <span fg={theme.faint}>{` ${pad(summary.costSource, 10)}`}</span>
            <span fg={theme.faint}>
              {padStart(formatUsd(summary.judgeCostUsd), 9)}
            </span>
            <span
              fg={theme.faint}
            >{` ${pad(summary.judgeCostSource ?? "–", 10)}`}</span>
            <span fg={theme.muted}>
              {padStart(
                summary.passRate > 0 && summary.costUsd !== undefined
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
