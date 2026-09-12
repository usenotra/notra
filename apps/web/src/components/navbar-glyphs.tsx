"use client";

import { Cancel01Icon, Menu02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { SPRING } from "@notra/ui/lib/motion";
import { cn } from "@notra/ui/lib/utils";
import { AnimatePresence, m, useReducedMotion } from "motion/react";

const MENU_ICON_HIDDEN = {
  filter: "blur(4px)",
  opacity: 0,
  rotate: -90,
  scale: 0.25,
} as const;

const MENU_ICON_VISIBLE = {
  filter: "blur(0px)",
  opacity: 1,
  rotate: 0,
  scale: 1,
} as const;

export function NavbarChevron({
  flipped,
  className,
}: {
  flipped: boolean;
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      className={cn("transition-transform", flipped && "rotate-180", className)}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M6 9l6 6l6 -6" />
    </svg>
  );
}

export function NavbarMenuToggle({ isOpen }: { isOpen: boolean }) {
  const reduceMotion = useReducedMotion();
  const transition = reduceMotion ? { duration: 0 } : SPRING.indicatorFlat;

  return (
    <span className="relative flex size-5 items-center justify-center">
      <AnimatePresence initial={false} mode="popLayout">
        <m.span
          animate={MENU_ICON_VISIBLE}
          className="absolute inset-0 flex items-center justify-center"
          exit={
            reduceMotion ? { opacity: 0 } : { ...MENU_ICON_HIDDEN, rotate: 90 }
          }
          initial={reduceMotion ? { opacity: 0 } : MENU_ICON_HIDDEN}
          key={isOpen ? "close" : "menu"}
          transition={transition}
        >
          <HugeiconsIcon
            className="size-5"
            icon={isOpen ? Cancel01Icon : Menu02Icon}
          />
        </m.span>
      </AnimatePresence>
    </span>
  );
}
