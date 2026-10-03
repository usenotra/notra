import { theme } from "../constants/theme";
import { bar } from "../utils/charts";

export interface KeyHint {
  readonly keys: string;
  readonly label: string;
}

export function KeyHints({ hints }: { hints: readonly KeyHint[] }) {
  return (
    <box flexDirection="row" gap={2} paddingLeft={1} height={1} flexShrink={0}>
      {hints.map((hint) => (
        <text key={hint.keys}>
          <span fg={theme.accent}>{hint.keys}</span>
          <span fg={theme.muted}> {hint.label}</span>
        </text>
      ))}
    </box>
  );
}

export function ProgressBar({
  done,
  errors,
  total,
  width,
  color = theme.good,
}: {
  done: number;
  errors: number;
  total: number;
  width: number;
  color?: string;
}) {
  const safeTotal = Math.max(1, total);
  const okText = bar(done / safeTotal, width);
  const errorCells = Math.round((errors / safeTotal) * width);
  const errText = "█".repeat(Math.min(errorCells, width - okText.length));
  const rest = Math.max(0, width - okText.length - errText.length);
  return (
    <text>
      <span fg={color}>{okText}</span>
      <span fg={theme.bad}>{errText}</span>
      <span fg={theme.border}>{"░".repeat(rest)}</span>
    </text>
  );
}

export function Badge({ label, color }: { label: string; color: string }) {
  return (
    <text>
      <span bg={color} fg={theme.bg}>
        {` ${label} `}
      </span>
    </text>
  );
}

export function Header({
  title,
  subtitle,
  demo,
}: {
  title: string;
  subtitle?: string;
  demo: boolean;
}) {
  return (
    <box
      flexDirection="row"
      justifyContent="space-between"
      paddingLeft={1}
      paddingRight={1}
      height={1}
      flexShrink={0}
    >
      <text>
        <span fg={theme.accent}>◆ notra evals</span>
        <span fg={theme.faint}> / </span>
        <span fg={theme.text}>{title}</span>
        {subtitle ? <span fg={theme.muted}>{`  ${subtitle}`}</span> : null}
      </text>
      {demo ? (
        <Badge label="DEMO" color={theme.warn} />
      ) : (
        <Badge label="LIVE" color={theme.good} />
      )}
    </box>
  );
}
