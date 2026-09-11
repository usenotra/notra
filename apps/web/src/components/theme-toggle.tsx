"use client";

import { Moon02Icon, Sun02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@notra/ui/components/ui/button";
import { SPRING } from "@notra/ui/lib/motion";
import { useHotkey } from "@tanstack/react-hotkeys";
import {
  AnimatePresence,
  domAnimation,
  LazyMotion,
  m,
  useReducedMotion,
} from "motion/react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

const ICON_HIDDEN = {
  filter: "blur(4px)",
  opacity: 0,
  rotate: -90,
  scale: 0.25,
} as const;

const ICON_VISIBLE = {
  filter: "blur(0px)",
  opacity: 1,
  rotate: 0,
  scale: 1,
} as const;

const ICON_EXIT = {
  ...ICON_HIDDEN,
  rotate: 90,
} as const;

function ThemeToggleGlyph({ isDark }: { isDark: boolean }) {
  const reduceMotion = useReducedMotion();
  const transition = reduceMotion ? { duration: 0 } : SPRING.indicatorFlat;

  return (
    <span className="relative flex size-4 items-center justify-center">
      <AnimatePresence initial={false} mode="popLayout">
        <m.span
          animate={ICON_VISIBLE}
          className="absolute inset-0 flex items-center justify-center"
          exit={reduceMotion ? { opacity: 0 } : ICON_EXIT}
          initial={reduceMotion ? { opacity: 0 } : ICON_HIDDEN}
          key={isDark ? "sun" : "moon"}
          transition={transition}
        >
          <HugeiconsIcon
            className="size-4"
            icon={isDark ? Sun02Icon : Moon02Icon}
          />
        </m.span>
      </AnimatePresence>
    </span>
  );
}

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = resolvedTheme === "dark";

  function handleToggle() {
    setTheme(isDark ? "light" : "dark");
  }

  useHotkey("D", handleToggle, { enabled: mounted });

  let ariaLabel = "Toggle theme";
  if (mounted && isDark) {
    ariaLabel = "Switch to light mode";
  } else if (mounted) {
    ariaLabel = "Switch to dark mode";
  }

  return (
    <LazyMotion features={domAnimation} strict>
      <Button
        aria-keyshortcuts="d"
        aria-label={ariaLabel}
        aria-pressed={mounted ? isDark : undefined}
        className="text-foreground h-9 w-9 overflow-visible rounded-lg p-0"
        onClick={handleToggle}
        type="button"
        variant="ghost"
      >
        {mounted ? (
          <ThemeToggleGlyph isDark={isDark} />
        ) : (
          <span className="size-4" />
        )}
      </Button>
    </LazyMotion>
  );
}
