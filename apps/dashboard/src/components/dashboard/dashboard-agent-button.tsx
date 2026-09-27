"use client";

import { Robot01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@notra/ui/components/ui/button";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";

import { useRightPanel } from "@/components/dashboard/right-panel-context";
import type { RightPanelId } from "@/types/components/right-panel";
import { isContentDetailPathname } from "@/utils/dashboard-paths";

export function DashboardAgentButton() {
  const t = useTranslations("dashboard.agent");
  const tCommon = useTranslations("common");
  const pathname = usePathname();
  const { active, togglePanel } = useRightPanel();
  const panelId: RightPanelId = isContentDetailPathname(pathname)
    ? "content"
    : "agent";
  const open = active === panelId;

  return (
    <Button
      aria-label={open ? t("closeLabel") : t("openLabel")}
      aria-pressed={open}
      className="hover:bg-background size-7 px-0 lg:w-auto lg:px-2.5"
      onClick={() => togglePanel(panelId)}
      size="sm"
      title={tCommon("labels.agent")}
      variant={open ? "secondary" : "ghost"}
    >
      <HugeiconsIcon icon={Robot01Icon} strokeWidth={1.8} />
      <span className="hidden lg:inline">{tCommon("labels.agent")}</span>
    </Button>
  );
}
