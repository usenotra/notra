import type { CalloutTone, CalloutVariant } from "../types/builtins";

export const CARD_GROUP_GRID: Record<number, string> = {
  1: "sm:grid-cols-1",
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
};

export const CALLOUT_TONES: Record<CalloutVariant, CalloutTone> = {
  note: { icon: "info", tone: "var(--muted-foreground)", label: "Note" },
  info: { icon: "info", tone: "var(--info)", label: "Info" },
  tip: { icon: "lightbulb", tone: "var(--success)", label: "Tip" },
  check: { icon: "circle-check", tone: "var(--success)", label: "Done" },
  warning: { icon: "triangle-alert", tone: "var(--warning)", label: "Warning" },
  danger: {
    icon: "octagon-alert",
    tone: "var(--destructive)",
    label: "Danger",
  },
};
