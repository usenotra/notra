import { Github01Icon, RssIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Badge } from "@notra/ui/components/ui/badge";
import { useTranslations } from "next-intl";

import type { IrisSignalsListProps } from "@/types/iris";
import {
  formatIrisRelativeTime,
  humanizeIrisSignalKind,
  humanizeIrisSignalStatus,
} from "@/utils/iris-copy";

function sourceIcon(source: string) {
  return source === "github" ? Github01Icon : RssIcon;
}

export function IrisSignalsList({ signals }: IrisSignalsListProps) {
  const t = useTranslations("iris");
  const tLabels = useTranslations("common.labels");
  const tCommon = useTranslations("common");
  if (signals.length === 0) {
    return (
      <div className="text-muted-foreground rounded-xl border border-dashed p-8 text-center text-sm">
        {t("signals.empty")}
      </div>
    );
  }

  return (
    <ul className="divide-border border-border divide-y rounded-xl border">
      {signals.map((signal) => (
        <li className="flex items-center gap-3 px-4 py-3" key={signal.id}>
          <HugeiconsIcon
            className="text-muted-foreground size-4 shrink-0"
            icon={sourceIcon(signal.source)}
          />
          <span className="min-w-0 flex-1 truncate text-sm font-medium">
            {humanizeIrisSignalKind(t, tLabels, signal.kind)}
          </span>
          <Badge variant="outline">
            {humanizeIrisSignalStatus(t, tLabels, signal.status)}
          </Badge>
          <span className="text-muted-foreground shrink-0 text-xs">
            {formatIrisRelativeTime(t, tCommon, signal.occurredAt)}
          </span>
        </li>
      ))}
    </ul>
  );
}
