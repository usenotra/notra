"use client";

import { cn } from "@notra/ui/lib/utils";
import { motion, useReducedMotion } from "motion/react";

import { useRightPanel } from "@/components/dashboard/right-panel-context";
import { RightPanelPortal } from "@/components/dashboard/right-panel-portal";
import {
  RIGHT_PANEL_CLASSNAME,
  RIGHT_PANEL_EXPANDED_WIDTH_CLASSNAME,
  RIGHT_PANEL_FRAME_CLASSNAME,
  RIGHT_PANEL_FRAME_DOCKED_WIDTH_CLASSNAME,
  RIGHT_PANEL_FRAME_EXPANDED_WIDTH_CLASSNAME,
  RIGHT_PANEL_OPEN_WIDTH_CLASSNAME,
  RIGHT_PANEL_SLOT_MOTION_CLASSNAME,
} from "@/constants/right-panel";
import { useRightPanelSkipMotion } from "@/lib/hooks/use-right-panel-slide";
import type { RightPanelProps } from "@/types/components/right-panel";

function panelWidthClass(open: boolean, expanded: boolean) {
  if (!open) {
    return "w-0";
  }
  if (expanded) {
    return RIGHT_PANEL_EXPANDED_WIDTH_CLASSNAME;
  }
  return RIGHT_PANEL_OPEN_WIDTH_CLASSNAME;
}

export function RightPanel({ id, children }: RightPanelProps) {
  const { active, expanded, hasOpened } = useRightPanel();
  const reduceMotion = useReducedMotion();
  const open = active === id;
  const skipMotion = useRightPanelSkipMotion(
    open,
    expanded,
    active !== null && !open
  );

  return (
    <RightPanelPortal>
      <aside
        aria-hidden={!open}
        data-closed={open ? undefined : ""}
        className={cn(
          RIGHT_PANEL_CLASSNAME,
          RIGHT_PANEL_SLOT_MOTION_CLASSNAME,
          skipMotion && "transition-none",
          open && "overflow-visible",
          panelWidthClass(open, expanded)
        )}
        inert={open ? undefined : true}
      >
        {hasOpened[id] ? (
          <motion.div
            layout
            layoutDependency={expanded}
            initial={false}
            transition={{
              layout: {
                duration: reduceMotion ? 0 : 0.25,
                ease: [0.23, 1, 0.32, 1],
              },
            }}
            className={cn(
              RIGHT_PANEL_FRAME_CLASSNAME,
              expanded
                ? RIGHT_PANEL_FRAME_EXPANDED_WIDTH_CLASSNAME
                : RIGHT_PANEL_FRAME_DOCKED_WIDTH_CLASSNAME
            )}
          >
            <motion.div
              className="flex h-full min-h-0 flex-col"
              layout="position"
              layoutDependency={expanded}
            >
              {children}
            </motion.div>
          </motion.div>
        ) : null}
      </aside>
    </RightPanelPortal>
  );
}
