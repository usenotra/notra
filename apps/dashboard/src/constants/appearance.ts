import {
  ComputerIcon,
  Moon02Icon,
  Sun03Icon,
} from "@hugeicons/core-free-icons";

export const APPEARANCE_OPTIONS = [
  {
    icon: Sun03Icon,
    value: "light",
  },
  {
    icon: Moon02Icon,
    value: "dark",
  },
  {
    icon: ComputerIcon,
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
