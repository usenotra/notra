"use client";

import { CheckmarkCircle02Icon, CircleIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@notra/ui/components/ui/button";
import { useTranslations } from "next-intl";

import { DEMO_MISSION_IDS } from "@/constants/demo-missions";
import type { DemoSandboxInfo } from "@/types/demo";

interface DemoMissionsProps {
  sandbox: DemoSandboxInfo | null;
  onOpenConsole: () => void;
}

/**
 * Guided walkthrough. Progress comes from what actually happened in the
 * sandbox, so doing a step any way (UI, console, curl, MCP) checks it off.
 */
export function DemoMissions({ sandbox, onOpenConsole }: DemoMissionsProps) {
  const t = useTranslations("demo.missions");
  if (!sandbox) {
    return null;
  }
  const done = DEMO_MISSION_IDS.filter((id) => sandbox.missions[id]).length;
  const allDone = done === DEMO_MISSION_IDS.length;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted-foreground text-sm tabular-nums">
        {t("progress", { done, total: DEMO_MISSION_IDS.length })}
      </p>
      <ol className="flex flex-col gap-2">
        {DEMO_MISSION_IDS.map((id) => {
          const complete = sandbox.missions[id];
          return (
            <li className="flex gap-3 rounded-lg border p-3" key={id}>
              <HugeiconsIcon
                aria-label={complete ? t("complete") : t("open")}
                className={
                  complete
                    ? "text-geo-up mt-0.5 size-4 shrink-0"
                    : "text-muted-foreground mt-0.5 size-4 shrink-0"
                }
                icon={complete ? CheckmarkCircle02Icon : CircleIcon}
              />
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="text-sm font-medium">{t(`${id}.title`)}</span>
                <span className="text-muted-foreground text-sm">
                  {t(`${id}.description`)}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
      {allDone ? (
        <div className="bg-muted/40 flex flex-col gap-2 rounded-lg border p-3">
          <p className="text-sm font-medium">{t("finishedTitle")}</p>
          <p className="text-muted-foreground text-sm">
            {t("finishedDescription")}
          </p>
          <Button
            nativeButton={false}
            render={<a href={sandbox.signupUrl} rel="noopener" />}
          >
            {t("signup")}
          </Button>
        </div>
      ) : (
        <Button onClick={onOpenConsole} variant="outline">
          {t("openConsole")}
        </Button>
      )}
    </div>
  );
}
