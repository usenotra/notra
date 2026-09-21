"use client";

import { useHotkey } from "@tanstack/react-hotkeys";
import { useTheme } from "next-themes";

export function AuthThemeHotkey() {
  const { setTheme } = useTheme();

  useHotkey("D", () => {
    const dark = document.documentElement.classList.contains("dark");
    setTheme(dark ? "light" : "dark");
  });

  return null;
}
