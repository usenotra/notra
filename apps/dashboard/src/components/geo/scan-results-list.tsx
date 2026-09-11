import {
  ArrowRight01Icon,
  MinusSignIcon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Badge } from "@notra/ui/components/ui/badge";

import { EngineIcon } from "@/components/geo/engine-icon";
import type { GeoScanResultsListProps } from "@/types/geo-scan-activity";
import { formatEngineWithMode } from "@/utils/geo-charts";

export function ScanResultsList({
  results,
  onSelect,
  footer,
}: GeoScanResultsListProps) {
  return (
    <div>
      <ul className="divide-y overflow-hidden rounded-lg">
        {results.map((row) => (
          <li key={row.id}>
            <button
              className="hover:bg-muted/40 focus-visible:ring-ring flex w-full items-center gap-3 p-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset"
              onClick={() => onSelect(row.id)}
              type="button"
            >
              <div className="min-w-0 flex-1 space-y-2">
                <p className="text-sm font-medium break-words">{row.prompt}</p>
                <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
                  <span className="inline-flex items-center gap-1.5">
                    <EngineIcon
                      className="size-3.5 shrink-0"
                      engine={row.engine}
                    />
                    {formatEngineWithMode(row.engine)}
                  </span>
                  <span>
                    {row.language}
                    {row.sequenceId ? ` · Turn ${row.turn}` : ""}
                  </span>
                  <Badge variant={row.mentioned ? "success" : "secondary"}>
                    <HugeiconsIcon
                      aria-hidden="true"
                      icon={row.mentioned ? Tick02Icon : MinusSignIcon}
                    />
                    {row.mentioned ? "Mentioned" : "Not mentioned"}
                  </Badge>
                  {row.position !== null ? (
                    <span className="tabular-nums">#{row.position}</span>
                  ) : null}
                  {row.sources > 0 ? (
                    <span className="tabular-nums">
                      {row.sources} {row.sources === 1 ? "source" : "sources"}
                    </span>
                  ) : null}
                </div>
              </div>
              <HugeiconsIcon
                aria-hidden="true"
                className="text-muted-foreground shrink-0"
                icon={ArrowRight01Icon}
                size={16}
              />
            </button>
          </li>
        ))}
      </ul>
      {footer}
    </div>
  );
}
