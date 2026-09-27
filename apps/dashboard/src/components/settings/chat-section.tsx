"use client";

import { Label } from "@notra/ui/components/ui/label";
import { Switch } from "@notra/ui/components/ui/switch";
import { TitleCard } from "@notra/ui/components/ui/title-card";
import { useTranslations } from "next-intl";

import { useShowAgentStats } from "@/lib/hooks/use-privacy-preferences";

export function ChatSection() {
  const t = useTranslations("settings.chat");
  const tCommon = useTranslations("common");
  const { showAgentStats, hasHydrated, isUpdating, setShowAgentStats } =
    useShowAgentStats();

  return (
    <TitleCard className="lg:col-span-2" heading={tCommon("labels.chat")}>
      <div className="space-y-4">
        <p className="text-muted-foreground text-sm">{t("description")}</p>

        <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
          <div className="min-w-0 space-y-1">
            <Label
              className="cursor-pointer text-sm font-medium"
              htmlFor="show-agent-stats"
            >
              {t("agentStats")}
            </Label>
            <p className="text-muted-foreground text-xs">
              {t.rich("agentStatsDescription", {
                link: (chunks) => (
                  <a
                    className="hover:text-foreground underline underline-offset-2"
                    href="https://t3.chat"
                    rel="noopener"
                    target="_blank"
                  >
                    {chunks}
                  </a>
                ),
              })}
            </p>
          </div>
          <Switch
            checked={showAgentStats}
            disabled={!hasHydrated || isUpdating}
            id="show-agent-stats"
            onCheckedChange={setShowAgentStats}
          />
        </div>
      </div>
    </TitleCard>
  );
}
