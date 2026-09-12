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
      aria-pressed={open}
      className="hover:bg-background hidden lg:inline-flex"
      onClick={() => togglePanel("agent")}
      size="sm"
      variant={open ? "secondary" : "ghost"}
    >
      <HugeiconsIcon icon={Robot01Icon} strokeWidth={1.8} />
      {DASHBOARD_AGENT_TITLE}
    </Button>
  );
}
