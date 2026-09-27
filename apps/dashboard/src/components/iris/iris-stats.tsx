import {
  Clock01Icon,
  Note01Icon,
  RssIcon,
  Satellite02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useTranslations } from "next-intl";

import type { CommonTranslator } from "@/types/i18n";
import type {
  IrisStats,
  IrisStatsRowProps,
  IrisStatTile,
  IrisTranslator,
} from "@/types/iris";
import { formatIrisRelativeTime } from "@/utils/iris-copy";

function buildTiles(
  t: IrisTranslator,
  tCommon: CommonTranslator,
  stats: IrisStats
): IrisStatTile[] {
  return [
    {
      key: "runs",
      label: t("stats.runs"),
      value: String(stats.runs30d),
      icon: Satellite02Icon,
    },
    {
      key: "artifacts",
      label: t("stats.artifacts"),
      value: String(stats.artifacts30d),
      icon: Note01Icon,
    },
    {
      key: "signals",
      label: t("stats.signals"),
      value: String(stats.signalsPending),
      icon: RssIcon,
    },
    {
      key: "last-run",
      label: t("stats.lastRun"),
      value: formatIrisRelativeTime(t, tCommon, stats.lastRunAt),
      icon: Clock01Icon,
    },
  ];
}

export function IrisStatsRow({ stats }: IrisStatsRowProps) {
  const t = useTranslations("iris");
  const tCommon = useTranslations("common");
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {buildTiles(t, tCommon, stats).map((tile) => (
        <div
          className="border-border space-y-2 rounded-xl border px-4 py-3"
          key={tile.key}
        >
          <div className="text-muted-foreground flex items-center gap-2 text-xs">
            <HugeiconsIcon className="size-3.5" icon={tile.icon} />
            {tile.label}
          </div>
          <p className="text-2xl font-semibold tracking-tight">{tile.value}</p>
        </div>
      ))}
    </div>
  );
}
