"use client";

import { Robot01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@notra/ui/components/ui/button";

import { useRightPanel } from "@/components/dashboard/right-panel-context";
import { DASHBOARD_AGENT_TITLE } from "@/constants/dashboard-agent";

export function DashboardAgentButton() {
  const { active, togglePanel } = useRightPanel();
  const open = active === "agent";

  return (
    <Button
      aria-label={`${open ? "Close" : "Open"} ${DASHBOARD_AGENT_TITLE}`}
      aria-pressed={open}
      className="hover:bg-background size-7 px-0 lg:w-auto lg:px-2.5"
      onClick={() => togglePanel("agent")}
      size="sm"
      title={DASHBOARD_AGENT_TITLE}
      variant={open ? "secondary" : "ghost"}
    >
      <HugeiconsIcon icon={Robot01Icon} strokeWidth={1.8} />
      <span className="hidden lg:inline">{DASHBOARD_AGENT_TITLE}</span>
    </Button>
  );
}
