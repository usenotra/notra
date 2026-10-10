export const BASE_LAYOUT_WIDTH_REM = 72;

export const LAYOUT_CONTAINERS_REM = {
  index: 64,
  post: 64,
  reading: 44,
} as const;

export const THEME_MODES = [
  { value: "light", label: "Light", icon: "sun" },
  { value: "dark", label: "Dark", icon: "moon" },
  { value: "system", label: "System", icon: "monitor" },
] as const;
