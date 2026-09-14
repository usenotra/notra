import {
  ComputerIcon,
  Moon02Icon,
  Sun03Icon,
} from "@hugeicons/core-free-icons";

export const APPEARANCE_OPTIONS = [
  {
    description: "Always use the light appearance",
    icon: Sun03Icon,
    label: "Light",
    value: "light",
  },
  {
    description: "Always use the dark appearance",
    icon: Moon02Icon,
    label: "Dark",
    value: "dark",
  },
  {
    description: "Match your device appearance",
    icon: ComputerIcon,
    label: "System",
    value: "system",
  },
] as const;

export const APPEARANCE_PREVIEW_STYLES = {
  light: {
    dot: "bg-neutral-300",
    line: "bg-neutral-200",
    mainBlock: "bg-neutral-50",
    mainLine: "bg-neutral-200",
    root: "border-neutral-200 bg-white",
    sidebar: "border-neutral-200 bg-neutral-50",
    systemOverlay: false,
  },
  dark: {
    dot: "bg-neutral-600",
    line: "bg-neutral-700",
    mainBlock: "bg-neutral-900",
    mainLine: "bg-neutral-800",
    root: "border-neutral-700 bg-neutral-950",
    sidebar: "border-neutral-800 bg-neutral-900",
    systemOverlay: false,
  },
  system: {
    dot: "bg-neutral-300",
    line: "bg-neutral-200",
    mainBlock: "bg-neutral-900",
    mainLine: "bg-neutral-800",
    root: "border-neutral-200 bg-white",
    sidebar: "border-neutral-200 bg-neutral-50",
    systemOverlay: true,
  },
} as const;
