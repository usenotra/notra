"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@notra/ui/components/ui/select";
import { useTranslations } from "use-intl";

import { EngineIcon } from "@/components/geo/engine-icon";
import type { PromptEngineSwitcherProps } from "@/types/geo";
import { formatEngineFamily } from "@/utils/geo-charts";

export function PromptEngineSwitcher({
  results,
  active,
  onChange,
  onPrefetch,
}: PromptEngineSwitcherProps) {
  const t = useTranslations("geo.promptEngineSwitcher");
  const engines = results.map((result) => result.engine);
  const activeIndex = engines.indexOf(active.engine);

  if (results.length === 1) {
    return (
      <div className="flex min-w-0 flex-1 items-center">
        <span className="bg-background inline-flex h-7 max-w-full min-w-0 items-center gap-1.5 rounded-lg border px-2.5 text-[0.8rem] font-medium">
          <EngineIcon className="size-3.5 shrink-0" engine={active.engine} />
          <span className="truncate">{formatEngineFamily(active.engine)}</span>
        </span>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-1 items-center">
      <Select
        onValueChange={(next) => {
          if (typeof next !== "string" || next === active.engine) {
            return;
          }
          onChange(next, engines.indexOf(next) >= activeIndex ? 1 : -1);
        }}
        value={active.engine}
      >
        <SelectTrigger
          aria-label={t("engine", {
            engine: formatEngineFamily(active.engine),
          })}
          className="w-60 max-w-full min-w-0"
        >
          <SelectValue>
            <EngineIcon className="size-3.5 shrink-0" engine={active.engine} />
            <span className="truncate">
              {formatEngineFamily(active.engine)}
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent
          align="start"
          alignItemWithTrigger={false}
          className="max-h-[min(60vh,24rem)]"
        >
          {results.map((result) => (
            <SelectItem
              key={result.engine}
              onPointerEnter={() => onPrefetch?.(result.engine)}
              value={result.engine}
            >
              <span className="flex min-w-0 items-center gap-2">
                <EngineIcon
                  className="size-3.5 shrink-0"
                  engine={result.engine}
                />
                <span className="truncate">
                  {formatEngineFamily(result.engine)}
                </span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
