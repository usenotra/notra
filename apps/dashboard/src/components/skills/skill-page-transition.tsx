import { type ReactNode, ViewTransition } from "react";

import { SKILL_NAV_TRANSITION_CLASSES } from "@/constants/skills";

/**
 * Wraps a skills page so list <-> detail navigations slide and fade over.
 * Only navigations tagged with a skill transition type animate; refreshes,
 * browser back and Suspense reveals swap instantly.
 */
export function SkillPageTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition
      default="none"
      enter={SKILL_NAV_TRANSITION_CLASSES}
      exit={SKILL_NAV_TRANSITION_CLASSES}
    >
      {children}
    </ViewTransition>
  );
}
