"use client";

import { cn } from "@notra/ui/lib/utils";

import { useRightPanel } from "@/components/dashboard/right-panel-context";
import { RightPanelPortal } from "@/components/dashboard/right-panel-portal";
import {
  RIGHT_PANEL_CLASSNAME,
  RIGHT_PANEL_EXPANDED_WIDTH_CLASSNAME,
  RIGHT_PANEL_FRAME_CLASSNAME,
  RIGHT_PANEL_FRAME_DOCKED_WIDTH_CLASSNAME,
  RIGHT_PANEL_FRAME_ENTERED_CLASSNAME,
  RIGHT_PANEL_FRAME_EXITED_CLASSNAME,
  RIGHT_PANEL_FRAME_EXPANDED_WIDTH_CLASSNAME,
  RIGHT_PANEL_FRAME_MOTION_CLASSNAME,
  RIGHT_PANEL_OPEN_WIDTH_CLASSNAME,
} from "@/constants/right-panel";
import { useRightPanelSlide } from "@/lib/hooks/use-right-panel-slide";
import type { RightPanelProps } from "@/types/components/right-panel";

function panelWidthClass(slotOpen: boolean, expanded: boolean) {
  if (!slotOpen) {
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
  const { entered, onFrameTransitionEnd, slotOpen } = useRightPanelSlide(
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
          panelWidthClass(slotOpen, expanded)
        )}
        inert={open ? undefined : true}
      >
        {hasOpened[id] ? (
          <div
            className={cn(
              RIGHT_PANEL_FRAME_CLASSNAME,
              RIGHT_PANEL_FRAME_MOTION_CLASSNAME,
              expanded
                ? RIGHT_PANEL_FRAME_EXPANDED_WIDTH_CLASSNAME
                : RIGHT_PANEL_FRAME_DOCKED_WIDTH_CLASSNAME,
              entered || expanded
                ? RIGHT_PANEL_FRAME_ENTERED_CLASSNAME
                : RIGHT_PANEL_FRAME_EXITED_CLASSNAME
            )}
            onTransitionEnd={onFrameTransitionEnd}
          >
            {children}
          </div>
        ) : null}
      </aside>
    </RightPanelPortal>
  );
}
