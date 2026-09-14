"use client";

import {
  AnimatePresence,
  domAnimation,
  LazyMotion,
  m,
  useReducedMotion,
} from "motion/react";

import type { GitHubBranchPanelTransitionProps } from "@/types/integrations/github";

export function GitHubBranchPanelTransition({
  branchList,
  createForm,
  creating,
}: GitHubBranchPanelTransitionProps) {
  const reduceMotion = useReducedMotion();
  const direction = creating ? 1 : -1;
  const enterState = reduceMotion
    ? { opacity: 0 }
    : {
        opacity: 0,
        filter: "blur(6px)",
        transform: `translateX(${direction * 12}px)`,
      };
  const exitState = reduceMotion
    ? { opacity: 0 }
    : {
        opacity: 0,
        filter: "blur(4px)",
        transform: `translateX(${direction * -12}px)`,
      };

  return (
    <LazyMotion features={domAnimation}>
      <AnimatePresence initial={false} mode="popLayout">
        <m.div
          animate={{
            opacity: 1,
            filter: "blur(0px)",
            transform: "translateX(0px)",
          }}
          className="h-full w-full"
          exit={exitState}
          initial={enterState}
          key={creating ? "create" : "branches"}
          transition={{
            duration: reduceMotion ? 0.12 : 0.2,
            ease: [0.23, 1, 0.32, 1],
          }}
        >
          {creating ? createForm : branchList}
        </m.div>
      </AnimatePresence>
    </LazyMotion>
  );
}
