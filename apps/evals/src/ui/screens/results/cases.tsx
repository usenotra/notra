import { scoreColor, seriesColor, theme } from "../../../constants/theme";
import type { AnySuite, EvalRun, TaskResult } from "../../../types/eval";
import { pad, padStart, truncate, wrapLine } from "../../../utils/charts";
import { formatMs, formatPct, formatUsd } from "../../../utils/stats";

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

export function CasesTab({
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
