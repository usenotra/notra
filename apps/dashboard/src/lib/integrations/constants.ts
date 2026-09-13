export const INTEGRATION_TAB_VALUES = [
  "all",
  "input",
  "output",
  "extension",
] as const;

export const INTEGRATION_CATEGORY_TABS = [
  { value: "all", label: "All" },
  { value: "input", label: "Input" },
  { value: "output", label: "Output" },
  { value: "extension", label: "Extensions" },
] as const;

export const INTEGRATION_CARD_DITHER_HEX_COLOR_PATTERN = /^#[\da-f]{6}$/i;
export const INTEGRATION_CARD_DITHER_FADE_OUT_DURATION = 300;

export const INTEGRATIONS_WITH_CONNECT_DIALOG = new Set<string>([
  "github",
  "linear",
  "granola",
  "slack",
]);
