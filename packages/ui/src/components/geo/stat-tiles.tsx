import { cn } from "@notra/ui/lib/utils";
import type { StatTilesProps } from "@notra/ui/types/geo";

function formatTileValue(value: string | number, locale?: string): string {
  return typeof value === "number" ? value.toLocaleString(locale) : value;
}

export function StatTiles({ tiles, className, locale }: StatTilesProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0",
        className
      )}
    >
      {tiles.map((tile) => (
        <div className="px-5 py-4" key={tile.key}>
          <p className="text-muted-foreground text-xs">{tile.label}</p>
          <div className="mt-1 flex gap-x-2">
            <span className="font-semibold text-3xl tabular-nums leading-none tracking-tight">
              {formatTileValue(tile.value, locale)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
