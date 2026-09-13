"use client";

import { Robot01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@notra/ui/components/ui/button";
import { usePathname } from "next/navigation";

import { useRightPanel } from "@/components/dashboard/right-panel-context";
import { DASHBOARD_AGENT_TITLE } from "@/constants/dashboard-agent";
import type { RightPanelId } from "@/types/components/right-panel";
import { isContentDetailPathname } from "@/utils/dashboard-paths";

export function DashboardAgentButton() {
  const pathname = usePathname();
  const { active, togglePanel } = useRightPanel();
  const panelId: RightPanelId = isContentDetailPathname(pathname)
    ? "content"
    : "agent";
  const open = active === panelId;

  return (
    <Button
      aria-label={`${open ? "Close" : "Open"} ${DASHBOARD_AGENT_TITLE}`}
      aria-pressed={open}
      className="hover:bg-background size-7 px-0 lg:w-auto lg:px-2.5"
      onClick={() => togglePanel(panelId)}
      size="sm"
      title={DASHBOARD_AGENT_TITLE}
      variant={open ? "secondary" : "ghost"}
    >
      <HugeiconsIcon icon={Robot01Icon} strokeWidth={1.8} />
      <span className="hidden lg:inline">{DASHBOARD_AGENT_TITLE}</span>
    </Button>
  );
}
