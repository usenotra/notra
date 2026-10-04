import { theme } from "../../../constants/theme";
import type { EvalRun, TaskResult } from "../../../types/eval";
import { truncate } from "../../../utils/charts";

export function ErrorsTab({ run, width }: { run: EvalRun; width: number }) {
  const groups = new Map<string, TaskResult[]>();
  for (const task of run.tasks) {
    if (task.status !== "error") {
      continue;
    }
    const key = (task.error ?? "unknown").replace(/\d+/g, "#").slice(0, 120);
    const group = groups.get(key);
    if (group) {
      group.push(task);
    } else {
      groups.set(key, [task]);
    }
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
