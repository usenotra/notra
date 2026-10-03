import { useKeyboard, useTerminalDimensions } from "@opentui/react";
import { useState } from "react";

import { theme } from "../../constants/theme";
import type { AnySuite, EvalRun } from "../../types/eval";
import { summarizeRun } from "../../utils/stats";
import { Header, KeyHints } from "../components";
import { CasesTab } from "./results/cases";
import { ErrorsTab } from "./results/errors";
import { FieldsTab } from "./results/fields";
import { OverviewTab } from "./results/overview";

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
