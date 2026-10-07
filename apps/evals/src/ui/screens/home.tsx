import { useKeyboard, useTerminalDimensions } from "@opentui/react";
import { useEffect, useMemo, useState } from "react";

import { CONTENDER_CATALOG, contenderFromId } from "../../constants/contenders";
import { theme } from "../../constants/theme";
import type { AnySuite, Contender } from "../../types/eval";
import { pad, truncate } from "../../utils/charts";
import { Header, KeyHints } from "../components";

export interface RunRequest {
  suite: AnySuite;
  contenders: Contender[];
  repeats: number;
  concurrency: number;
}

type Focus = "suites" | "models" | "add";

/** Picker state kept by the app so it survives a trip to the run screen. */
export interface HomeMemory {
  extraModels: Contender[];
  selectedBySuite: Record<string, string[]>;
  repeats: number;
  concurrency: number;
}

export function createHomeMemory(): HomeMemory {
  return { extraModels: [], selectedBySuite: {}, repeats: 1, concurrency: 6 };
}

export function HomeScreen({
  suites,
  demo,
  initialSuiteId,
  memory,
  onRun,
  onHistory,
  onPicker,
  onToggleDemo,
  onQuit,
}: {
  suites: readonly AnySuite[];
  demo: boolean;
  initialSuiteId?: string;
  memory: HomeMemory;
  onRun: (request: RunRequest) => void;
  onHistory: () => void;
  onPicker: () => void;
  onToggleDemo: () => void;
  onQuit: () => void;
}) {
  const { width, height } = useTerminalDimensions();
  const [suiteIndex, setSuiteIndex] = useState(() =>
    Math.max(
      0,
      suites.findIndex((suite) => suite.id === initialSuiteId)
    )
  );
  const [focus, setFocus] = useState<Focus>("suites");
  const [modelIndex, setModelIndex] = useState(0);
  const [extraModels, setExtraModels] = useState<Contender[]>(
    memory.extraModels
  );
  const [selectedBySuite, setSelectedBySuite] = useState<
    Record<string, string[]>
  >(memory.selectedBySuite);
  const [repeats, setRepeats] = useState(memory.repeats);
  const [concurrency, setConcurrency] = useState(memory.concurrency);

  useEffect(() => {
    Object.assign(memory, {
      extraModels,
      selectedBySuite,
      repeats,
      concurrency,
    });
  }, [memory, extraModels, selectedBySuite, repeats, concurrency]);
  const [draft, setDraft] = useState("");

  const suite = suites[suiteIndex] ?? suites[0];
  const models = useMemo(() => {
    const all = [...CONTENDER_CATALOG, ...extraModels];
    for (const id of suite?.defaultContenders ?? []) {
      if (!all.some((item) => item.modelId === id)) {
        all.push(contenderFromId(id));
      }
    }
    return all;
  }, [extraModels, suite]);
  const selected = new Set(
    (suite && selectedBySuite[suite.id]) ?? suite?.defaultContenders ?? []
  );

  const toggleModel = (key: string) => {
    if (!suite) {
      return;
    }
    const next = new Set(selected);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    setSelectedBySuite((current) => ({ ...current, [suite.id]: [...next] }));
  };

  const startRun = () => {
    if (!suite) {
      return;
    }
    const contenders = models.filter((model) => selected.has(model.key));
    if (contenders.length === 0) {
      return;
    }
    onRun({ suite, contenders, repeats, concurrency });
  };

  useKeyboard((key) => {
    if (focus === "add") {
      if (key.name === "escape") {
        setFocus("models");
        setDraft("");
      }
      return;
    }
    switch (key.name) {
      case "q":
        onQuit();
        return;
      case "tab":
        setFocus((current) => (current === "suites" ? "models" : "suites"));
        return;
      case "left":
        setFocus("suites");
        return;
      case "right":
        setFocus("models");
        return;
      case "return":
        if (focus === "suites") {
          setFocus("models");
        } else {
          startRun();
        }
        return;
      case "r":
        startRun();
        return;
      case "p":
        onPicker();
        return;
      case "h":
        onHistory();
        return;
      case "d":
        onToggleDemo();
        return;
      case "a":
        setFocus("add");
        return;
      case "+":
      case "=":
        setRepeats((value) => Math.min(10, value + 1));
        return;
      case "-":
        setRepeats((value) => Math.max(1, value - 1));
        return;
      case "]":
        setConcurrency((value) => Math.min(32, value + 1));
        return;
      case "[":
        setConcurrency((value) => Math.max(1, value - 1));
        return;
      case "space":
        if (focus === "models") {
          const model = models[modelIndex];
          if (model) {
            toggleModel(model.key);
          }
        }
        return;
      case "up":
      case "k":
        if (focus === "suites") {
          setSuiteIndex((value) => (value - 1 + suites.length) % suites.length);
        } else {
          setModelIndex((value) => (value - 1 + models.length) % models.length);
        }
        return;
      case "down":
      case "j":
        if (focus === "suites") {
          setSuiteIndex((value) => (value + 1) % suites.length);
        } else {
          setModelIndex((value) => (value + 1) % models.length);
        }
        return;
      default:
    }
  });

  const leftWidth = Math.min(44, Math.floor(width * 0.38));
  const detailWidth = width - leftWidth - 6;
  const caseCount = suite?.cases.length ?? 0;
  const calls = caseCount * selected.size * repeats;

  return (
    <box
      flexDirection="column"
      width="100%"
      height="100%"
      backgroundColor={theme.bg}
    >
      <Header
        title="Suites"
        subtitle="content harness, split by stage"
        demo={demo}
      />
      <box
        flexDirection="row"
        flexGrow={1}
        gap={1}
        paddingLeft={1}
        paddingRight={1}
      >
        <box
          title=" Suites "
          border
          borderStyle="rounded"
          borderColor={focus === "suites" ? theme.borderFocus : theme.border}
          width={leftWidth}
          flexDirection="column"
          paddingLeft={1}
          paddingRight={1}
        >
          {suites.map((item, index) => {
            const active = index === suiteIndex;
            return (
              <box key={item.id} flexDirection="column" marginBottom={1}>
                <text>
                  <span fg={active ? theme.accent : theme.faint}>
                    {active ? "▸ " : "  "}
                  </span>
                  <span fg={active ? theme.text : theme.muted}>
                    {truncate(item.name, leftWidth - 14)}
                  </span>
                  <span
                    fg={
                      item.kind === "classification"
                        ? theme.running
                        : theme.warn
                    }
                  >
                    {item.kind === "classification" ? "  cls" : "  gen"}
                  </span>
                </text>
                <text
                  fg={theme.faint}
                >{`  ${truncate(item.stage, leftWidth - 6)}`}</text>
              </box>
            );
          })}
        </box>

        <box flexDirection="column" flexGrow={1} gap={1}>
          <box
            title={` ${suite?.name ?? ""} `}
            border
            borderStyle="rounded"
            borderColor={theme.border}
            flexDirection="column"
            paddingLeft={1}
            paddingRight={1}
            flexShrink={0}
          >
            <text fg={theme.muted} wrapMode="word">
              {suite?.description ?? ""}
            </text>
            <text>
              <span fg={theme.faint}>stage </span>
              <span fg={theme.text}>{suite?.stage ?? ""}</span>
            </text>
            <text>
              <span fg={theme.faint}>cases </span>
              <span fg={theme.text}>{String(caseCount)}</span>
              <span fg={theme.faint}> timeout </span>
              <span
                fg={theme.text}
              >{`${Math.round((suite?.timeoutMs ?? 0) / 1000)}s`}</span>
              {suite?.labelFields?.length ? (
                <>
                  <span fg={theme.faint}> fields </span>
                  <span fg={theme.text}>{suite.labelFields.join(", ")}</span>
                </>
              ) : null}
            </text>
          </box>

          <box
            title=" Models "
            border
            borderStyle="rounded"
            borderColor={focus === "models" ? theme.borderFocus : theme.border}
            flexDirection="column"
            flexGrow={1}
            paddingLeft={1}
            paddingRight={1}
          >
            {models.slice(0, Math.max(1, height - 22)).map((model, index) => {
              const active = focus === "models" && index === modelIndex;
              const isOn = selected.has(model.key);
              const isDefault = suite?.defaultContenders.includes(model.key);
              return (
                <text key={model.key}>
                  <span fg={active ? theme.accent : theme.faint}>
                    {active ? "▸ " : "  "}
                  </span>
                  <span fg={isOn ? theme.good : theme.faint}>
                    {isOn ? "◉ " : "○ "}
                  </span>
                  <span fg={isOn ? theme.text : theme.muted}>
                    {pad(model.label, 24)}
                  </span>
                  <span fg={theme.faint}>
                    {pad(model.modelId, Math.max(10, detailWidth - 44))}
                  </span>
                  <span fg={model.kind === "jev" ? theme.warn : theme.faint}>
                    {model.kind === "jev" ? " jev" : ""}
                  </span>
                  <span fg={theme.faint}>{isDefault ? " · prod" : ""}</span>
                </text>
              );
            })}
            {focus === "add" ? (
              <box flexDirection="row" marginTop={1} height={1}>
                <text fg={theme.accent}>+ </text>
                <input
                  focused
                  placeholder="gateway model id, e.g. openai/gpt-6-luna-fast"
                  value={draft}
                  onInput={setDraft}
                  onSubmit={(value) => {
                    const id = String(value).trim();
                    if (id) {
                      const contender = contenderFromId(id);
                      setExtraModels((current) =>
                        current.some((item) => item.key === contender.key)
                          ? current
                          : [...current, contender]
                      );
                      toggleModel(contender.key);
                    }
                    setDraft("");
                    setFocus("models");
                  }}
                  flexGrow={1}
                />
              </box>
            ) : null}
          </box>

          <box
            flexDirection="row"
            gap={3}
            height={1}
            flexShrink={0}
            paddingLeft={1}
          >
            <text>
              <span fg={theme.faint}>repeats </span>
              <span fg={theme.text}>{String(repeats)}</span>
            </text>
            <text>
              <span fg={theme.faint}>concurrency </span>
              <span fg={theme.text}>{String(concurrency)}</span>
            </text>
            <text>
              <span fg={theme.faint}>calls </span>
              <span fg={calls > 0 ? theme.text : theme.bad}>
                {String(calls)}
              </span>
            </text>
            <text fg={demo ? theme.warn : theme.good}>
              {demo ? "demo: no API calls" : "live: real gateway calls"}
            </text>
          </box>
        </box>
      </box>
      <KeyHints
        hints={[
          { keys: "↑↓", label: "move" },
          { keys: "tab", label: "pane" },
          { keys: "space", label: "toggle model" },
          { keys: "a", label: "add model" },
          { keys: "+/-", label: "repeats" },
          { keys: "[/]", label: "concurrency" },
          { keys: "r", label: "run" },
          { keys: "h", label: "history" },
          { keys: "p", label: "pick models" },
          { keys: "d", label: demo ? "live mode" : "demo mode" },
          { keys: "q", label: "quit" },
        ]}
      />
    </box>
  );
}
