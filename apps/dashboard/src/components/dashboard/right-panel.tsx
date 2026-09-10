"use client";

import { cn } from "@notra/ui/lib/utils";

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
        className={cn(
          RIGHT_PANEL_CLASSNAME,
          RIGHT_PANEL_SLOT_MOTION_CLASSNAME,
          skipMotion && "transition-none",
          panelWidthClass(open, expanded)
        )}
        inert={open ? undefined : true}
      >
        {hasOpened[id] ? (
          <div
            className={cn(
              RIGHT_PANEL_FRAME_CLASSNAME,
              expanded
                ? RIGHT_PANEL_FRAME_EXPANDED_WIDTH_CLASSNAME
                : RIGHT_PANEL_FRAME_DOCKED_WIDTH_CLASSNAME
            )}
          >
            {children}
          </div>
        ) : null}
      </aside>
    </RightPanelPortal>
  );
}
