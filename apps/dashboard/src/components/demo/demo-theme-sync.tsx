"use client";

import { useTheme } from "next-themes";
import { useQueryState } from "nuqs";
import { useEffect } from "react";

import { DEMO_FRAME_ANCESTOR, DEMO_THEME_PARAM } from "@/constants/demo";
import { demoThemeParser } from "@/lib/demo/theme-param";
import { demoThemeMessageSchema } from "@/schemas/demo";

/**
 * Applies `?theme=light|dark` once, then drops it from the URL, and follows
 * theme messages from the embedding landing page.
 */
export function DemoThemeSync() {
  const [theme, setThemeParam] = useQueryState(
    DEMO_THEME_PARAM,
    demoThemeParser
  );
  const { setTheme } = useTheme();

  useEffect(() => {
    if (!theme) {
      return;
    }
    setTheme(theme);
    void setThemeParam(null);
  }, [theme, setTheme, setThemeParam]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== DEMO_FRAME_ANCESTOR) {
        return;
      }
      const message = demoThemeMessageSchema.safeParse(event.data);
      if (message.success) {
        setTheme(message.data.theme);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [setTheme]);

  return null;
}
