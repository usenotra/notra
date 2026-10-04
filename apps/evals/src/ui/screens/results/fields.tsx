import {
  scoreColor,
  seriesColor,
  theme,
  matrixCellColor,
} from "../../../constants/theme";
import type { AnySuite, ContenderSummary, EvalRun } from "../../../types/eval";
import { bar, pad, padStart, shade, truncate } from "../../../utils/charts";
import { confusionMatrix, formatPct } from "../../../utils/stats";

export function FieldsTab({
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
