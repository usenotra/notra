import { useKeyboard, useTerminalDimensions } from "@opentui/react";
import { useEffect, useMemo, useState } from "react";

import { MAX_ERROR_RATE, MIN_CASES } from "../../constants/picker";
import { scoreColor, seriesColor, theme } from "../../constants/theme";
import type { ModelPrice } from "../../models/pricing";
import { savePickerSettings } from "../../store/picker-settings";
import type { AnySuite, EvalRun } from "../../types/eval";
import type { PickerSettings, SuitePick } from "../../types/picker";
import { pad, padStart, scatterGrid, truncate } from "../../utils/charts";
import {
  formatPerThousand,
  pickForSuite,
  verificationModels,
} from "../../utils/picker";
import { formatMs, formatPct } from "../../utils/stats";
import { Header, KeyHints } from "../components";

const MAX_TOLERANCE_PTS = 20;
const MIN_VOLUME = 100;
const MAX_VOLUME = 10_000_000;
const SCATTER_WIDTH = 36;
const SCATTER_HEIGHT = 10;

function formatVolume(volume: number): string {
  if (volume >= 1_000_000) {
    return `${+(volume / 1_000_000).toFixed(1)}M`;
  }
  if (volume >= 1000) {
    return `${+(volume / 1000).toFixed(1)}k`;
  }
  return String(volume);
}

function formatMonthly(usd: number): string {
  if (usd <= 0) {
    return "$0";
  }
  return usd < 10
    ? `$${usd.toFixed(2)}`
    : `$${Math.round(usd).toLocaleString("en-US")}`;
}

function formatSaving(now?: number, next?: number): string {
  if (now === undefined || next === undefined) {
    return "–";
  }
  const saving = now - next;
  if (Math.abs(saving) < 0.005) {
    return "keep";
  }
  return saving > 0
    ? `-${formatMonthly(saving)}`
    : `+${formatMonthly(-saving)}`;
}

function pickColor(hasPick: boolean, isSameAsProd: boolean): string {
  if (!hasPick) {
    return theme.faint;
  }
  return isSameAsProd ? theme.muted : theme.good;
}

function savingColor(saving: string): string {
  if (saving.startsWith("-")) {
    return theme.good;
  }
  return saving.startsWith("+") ? theme.warn : theme.faint;
}

function noteColor(isPick: boolean, eligible: boolean): string {
  if (isPick) {
    return theme.good;
  }
  return eligible ? theme.muted : theme.warn;
}

function PlanTable({
  picks,
  index,
  width,
}: {
  picks: readonly SuitePick[];
  index: number;
  width: number;
}) {
  // Fixed columns take 82 cells; borders, margins and padding take 6.
  const modelWidth = Math.max(12, Math.min(20, Math.floor((width - 88) / 2)));
  let totalNow = 0;
  let totalNext = 0;
  for (const pick of picks) {
    if (
      pick.monthlyNow !== undefined &&
      pick.monthlyRecommended !== undefined
    ) {
      totalNow += pick.monthlyNow;
      totalNext += pick.monthlyRecommended;
    }
  }
  return (
    <box
      title=" Plan: cheapest model per stage that clears the bar "
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
        {`  ${pad("stage", 22)}${pad("prod today", modelWidth)}${padStart("score", 7)}  ${pad("pick", modelWidth)}${padStart("score", 7)}${padStart("calls/mo", 10)}${padStart("$/mo now", 11)}${padStart("$/mo pick", 11)}${padStart("Δ/mo", 10)}`}
      </text>
      {picks.map((pick, offset) => {
        const active = offset === index;
        const prod = pick.production;
        const next = pick.recommended;
        const same = prod && next && prod.modelId === next.modelId;
        const saving = formatSaving(pick.monthlyNow, pick.monthlyRecommended);
        return (
          <text key={pick.suite.id}>
            <span fg={active ? theme.accent : theme.faint}>
              {active ? "▸ " : "  "}
            </span>
            <span fg={active ? theme.text : theme.muted}>
              {pad(pick.suite.id, 22)}
            </span>
            <span fg={prod ? theme.text : theme.faint}>
              {pad(
                prod?.label ?? `${pick.suite.productionModel} (no data)`,
                modelWidth
              )}
            </span>
            <span fg={prod ? scoreColor(prod.score) : theme.faint}>
              {padStart(prod ? formatPct(prod.score) : "–", 7)}
            </span>
            <span>{"  "}</span>
            <span fg={pickColor(Boolean(next), Boolean(same))}>
              {pad(
                next
                  ? `${same ? "= " : ""}${next.label}${pick.smallSample ? " ?" : ""}`
                  : "no eligible model",
                modelWidth
              )}
            </span>
            <span fg={next ? scoreColor(next.score) : theme.faint}>
              {padStart(next ? formatPct(next.score) : "–", 7)}
            </span>
            <span fg={theme.muted}>
              {padStart(
                pick.includedIn
                  ? `in ${pick.includedIn.replace("content-", "")}`
                  : formatVolume(pick.volume),
                10
              )}
            </span>
            <span fg={theme.muted}>
              {padStart(
                pick.monthlyNow === undefined
                  ? "–"
                  : formatMonthly(pick.monthlyNow),
                11
              )}
            </span>
            <span fg={theme.muted}>
              {padStart(
                pick.monthlyRecommended === undefined
                  ? "–"
                  : formatMonthly(pick.monthlyRecommended),
                11
              )}
            </span>
            <span fg={savingColor(saving)}>{padStart(saving, 10)}</span>
          </text>
        );
      })}
      <text>
        <span
          fg={theme.faint}
        >{`  ${pad("subtotal (stages with known costs)", 22 + modelWidth * 2 + 16 + 10)}`}</span>
        <span fg={theme.text}>{padStart(formatMonthly(totalNow), 11)}</span>
        <span fg={theme.text}>{padStart(formatMonthly(totalNext), 11)}</span>
        <span fg={totalNow - totalNext > 0.005 ? theme.good : theme.faint}>
          {padStart(formatSaving(totalNow, totalNext), 10)}
        </span>
      </text>
    </box>
  );
}

export function ModelTable({
  pick,
  width,
}: {
  pick: SuitePick;
  width: number;
}) {
  const labelWidth = Math.max(14, Math.min(24, width - 92));
  const noteWidth = Math.max(10, width - labelWidth - 72);
  return (
    <box
      title={` ${pick.suite.name}: measured models, cheapest first `}
      border
      borderStyle="rounded"
      borderColor={theme.border}
      flexDirection="column"
      paddingLeft={1}
      paddingRight={1}
      flexGrow={1}
    >
      <text fg={theme.faint}>
        {`    ${pad("model", labelWidth)}${padStart("score", 7)}${padStart("±", 6)}${padStart("pass", 7)}${padStart("err", 5)}${padStart("$/1k", 10)}${padStart("$/mo", 10)}${padStart("p50", 8)}  ${pad("run", 13)}${pad("note", noteWidth)}`}
      </text>
      {pick.evidence.length === 0 ? (
        <text fg={theme.faint}>
          No saved runs for this suite in this mode. Press v to run one.
        </text>
      ) : null}
      {pick.evidence.map((item, series) => {
        const isPick = item.modelId === pick.recommended?.modelId;
        const isProd = item.modelId === pick.suite.productionModel;
        let note = item.blocker ?? "";
        if (isPick) {
          note = pick.smallSample
            ? `recommended, only ${item.cases} cases: verify`
            : "recommended";
        } else if (!note && item.frontier) {
          note = "on frontier";
        }
        if (isProd) {
          note = note ? `prod, ${note}` : "prod";
        }
        note = note ? `${item.costSource}, ${note}` : item.costSource;
        return (
          <text key={item.modelId}>
            <span fg={seriesColor(series)}>{"● "}</span>
            <span fg={isPick ? theme.good : theme.faint}>
              {isPick ? "★ " : "  "}
            </span>
            <span fg={item.eligible ? theme.text : theme.muted}>
              {pad(item.label, labelWidth)}
            </span>
            <span fg={scoreColor(item.score)}>
              {padStart(formatPct(item.score), 7)}
            </span>
            <span fg={theme.faint}>
              {padStart((item.scoreSe * 100).toFixed(1), 6)}
            </span>
            <span fg={theme.muted}>
              {padStart(formatPct(item.passRate), 7)}
            </span>
            <span fg={item.errors ? theme.bad : theme.faint}>
              {padStart(String(item.errors), 5)}
            </span>
            <span fg={theme.text}>
              {padStart(formatPerThousand(item.costPerCall), 10)}
            </span>
            <span fg={theme.muted}>
              {padStart(
                pick.includedIn || item.costPerCall === undefined
                  ? "–"
                  : formatMonthly(item.costPerCall * pick.volume),
                10
              )}
            </span>
            <span fg={theme.muted}>{padStart(formatMs(item.p50Ms), 8)}</span>
            <span
              fg={theme.faint}
            >{`  ${pad(item.runAt.slice(5, 16).replace("T", " "), 13)}`}</span>
            <span fg={noteColor(isPick, item.eligible)}>
              {pad(note, noteWidth)}
            </span>
          </text>
        );
      })}
      {pick.candidates.length > 0 ? (
        <box flexDirection="column" marginTop={1}>
          <text fg={theme.faint}>
            Untested, estimated cheaper than the pick (avg tokens × gateway
            price):
          </text>
          <text fg={theme.muted}>
            {truncate(
              pick.candidates
                .slice(0, 5)
                .map(
                  (item) =>
                    `${item.label} ~${formatPerThousand(item.estCostPerCall)}/1k`
                )
                .join("   "),
              width - 4
            )}
          </text>
        </box>
      ) : null}
    </box>
  );
}

interface Segment {
  readonly start: number;
  readonly text: string;
  readonly color: string;
}

/** Collapses a scatter row into runs of equal colour. */
function rowSegments(row: readonly number[], isBarRow: boolean): Segment[] {
  const segments: Segment[] = [];
  for (const [col, series] of row.entries()) {
    const color = series >= 0 ? seriesColor(series) : theme.border;
    let char = " ";
    if (series >= 0) {
      char = "●";
    } else if (isBarRow) {
      char = "┄";
    }
    const last = segments.at(-1);
    if (last && last.color === color) {
      segments[segments.length - 1] = { ...last, text: last.text + char };
    } else {
      segments.push({ start: col, text: char, color });
    }
  }
  return segments;
}

function CostScatter({ pick }: { pick: SuitePick }) {
  const points = pick.evidence.flatMap((item) =>
    item.costPerCall !== undefined && item.costPerCall > 0
      ? [{ ...item, costPerCall: item.costPerCall }]
      : []
  );
  const xs = points.map((item) => Math.log10(item.costPerCall));
  const ys = points.map((item) => item.score);
  const xRange: [number, number] = [
    Math.min(...xs) - 0.1,
    Math.max(...xs) + 0.1,
  ];
  const yLow = Math.max(0, Math.floor((Math.min(...ys) - 0.02) * 20) / 20);
  const yRange: [number, number] = [yLow, 1];
  const grid = scatterGrid(
    points.map((item) => ({
      x: Math.log10(item.costPerCall),
      y: item.score,
      series: pick.evidence.findIndex(
        (evidence) => evidence.modelId === item.modelId
      ),
    })),
    SCATTER_WIDTH,
    SCATTER_HEIGHT,
    xRange,
    yRange
  );
  const barRow =
    pick.bestScore > 0
      ? Math.round(
          ((yRange[1] - pick.bestScore) / (yRange[1] - yRange[0])) *
            (SCATTER_HEIGHT - 1)
        )
      : -1;

  return (
    <box
      title=" score vs $/1k calls (log) "
      border
      borderStyle="rounded"
      borderColor={theme.border}
      flexDirection="column"
      paddingLeft={1}
      paddingRight={1}
      width={SCATTER_WIDTH + 10}
      flexShrink={0}
      alignSelf="flex-start"
    >
      {points.length === 0 ? (
        <text fg={theme.faint}>no cost data</text>
      ) : (
        grid.map((row, rowIndex) => {
          let label = "     ";
          if (rowIndex === 0) {
            label = padStart(formatPct(yRange[1]).replace(".0", ""), 5);
          } else if (rowIndex === SCATTER_HEIGHT - 1) {
            label = padStart(formatPct(yRange[0]).replace(".0", ""), 5);
          }
          return (
            <text key={`row-${rowIndex}`}>
              <span fg={theme.faint}>{`${label}│`}</span>
              {rowSegments(row, rowIndex === barRow).map((segment) => (
                <span key={`${rowIndex}-${segment.start}`} fg={segment.color}>
                  {segment.text}
                </span>
              ))}
            </text>
          );
        })
      )}
      {points.length > 0 ? (
        <text fg={theme.faint}>
          {`     └${pad(formatPerThousand(10 ** xRange[0]), Math.floor(SCATTER_WIDTH / 2))}${padStart(formatPerThousand(10 ** xRange[1]), Math.ceil(SCATTER_WIDTH / 2))}`}
        </text>
      ) : null}
      <text fg={theme.faint}>┄ best score up-left = better</text>
    </box>
  );
}

export function PickerScreen({
  suites,
  runs,
  prices,
  demo,
  initialSettings,
  onVerify,
  onOpenRun,
  onBack,
}: {
  suites: readonly AnySuite[];
  runs: readonly EvalRun[];
  prices: Readonly<Record<string, ModelPrice>>;
  demo: boolean;
  initialSettings: PickerSettings;
  onVerify: (suite: AnySuite, modelIds: string[]) => void;
  onOpenRun: (run: EvalRun) => void;
  onBack: () => void;
}) {
  const { width } = useTerminalDimensions();
  const [index, setIndex] = useState(0);
  const [settings, setSettings] = useState(initialSettings);

  useEffect(() => {
    savePickerSettings(settings).catch(() => undefined);
  }, [settings]);

  const picks = useMemo(
    () =>
      suites.map((suite) =>
        pickForSuite({ suite, runs, demo, settings, prices })
      ),
    [suites, runs, demo, settings, prices]
  );
  const pick = picks[index] ?? picks[0];

  const setVolume = (factor: number) => {
    if (!pick || pick.includedIn) {
      return;
    }
    const next = Math.round(
      Math.max(MIN_VOLUME, Math.min(MAX_VOLUME, pick.volume * factor))
    );
    setSettings((value) => ({
      ...value,
      volumes: { ...value.volumes, [pick.suite.id]: next },
    }));
  };

  useKeyboard((key) => {
    switch (key.name) {
      case "up":
      case "k":
        setIndex((value) => Math.max(0, value - 1));
        return;
      case "down":
      case "j":
        setIndex((value) => Math.min(picks.length - 1, value + 1));
        return;
      case "left":
        setSettings((value) => ({
          ...value,
          tolerancePts: Math.max(0, value.tolerancePts - 0.5),
        }));
        return;
      case "right":
        setSettings((value) => ({
          ...value,
          tolerancePts: Math.min(MAX_TOLERANCE_PTS, value.tolerancePts + 0.5),
        }));
        return;
      case "+":
      case "=":
        setVolume(2);
        return;
      case "-":
        setVolume(0.5);
        return;
      case "v":
        if (pick) {
          onVerify(pick.suite, verificationModels(pick));
        }
        return;
      case "return": {
        const latest = runs.find(
          (run) =>
            run.config.suiteId === pick?.suite.id && run.config.demo === demo
        );
        if (latest) {
          onOpenRun(latest);
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

  if (!pick) {
    return null;
  }

  return (
    <box
      flexDirection="column"
      width="100%"
      height="100%"
      backgroundColor={theme.bg}
    >
      <Header
        title="Model picker"
        subtitle={`latest ${demo ? "demo" : "live"} run per model · bar = best − ${settings.tolerancePts} pts · ≥${MIN_CASES} cases (or all) · ≤${MAX_ERROR_RATE * 100}% errors`}
        demo={demo}
      />
      <PlanTable picks={picks} index={index} width={width} />
      <box
        flexDirection="row"
        flexGrow={1}
        marginLeft={1}
        marginRight={1}
        gap={1}
      >
        <ModelTable pick={pick} width={width - SCATTER_WIDTH - 14} />
        <CostScatter pick={pick} />
      </box>
      <KeyHints
        hints={[
          { keys: "↑↓", label: "stage" },
          { keys: "←→", label: `tolerance ${settings.tolerancePts} pts` },
          { keys: "+/-", label: "calls/mo" },
          { keys: "v", label: "verify run (×2)" },
          { keys: "enter", label: "latest run" },
          { keys: "b", label: "back" },
        ]}
      />
    </box>
  );
}
