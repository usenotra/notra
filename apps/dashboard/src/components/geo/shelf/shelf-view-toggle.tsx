"use client";

import { KanbanIcon, TableIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { SPRING } from "@notra/ui/lib/motion";
import {
  LayoutGroup,
  LazyMotion,
  domMax,
  m,
  useReducedMotion,
} from "motion/react";
import { useTranslations } from "next-intl";
import { startTransition, useId, useOptimistic } from "react";

import { GEO_SHELF_VIEWS } from "@/constants/geo-shelf";
import { cn } from "@/lib/utils";
import type { GeoShelfViewToggleProps } from "@/types/geo-shelf";

const VIEW_ICONS = {
  table: TableIcon,
  board: KanbanIcon,
} as const;

const INSTANT = { duration: 0 } as const;

export function ShelfViewToggle({
  view,
  onViewChange,
}: GeoShelfViewToggleProps) {
  const t = useTranslations("geo.shelf.shelfViewToggle");
  const tLabels = useTranslations("common.labels");
  const layoutId = useId();
  const reduceMotion = useReducedMotion();
  const pillTransition = reduceMotion ? INSTANT : SPRING.indicatorFlat;
  const [activeView, setActiveView] = useOptimistic(view);

  return (
    <LazyMotion features={domMax} strict>
      <LayoutGroup id={layoutId}>
        <div
          aria-label={t("ariaLabel")}
          className="bg-muted inline-flex items-center rounded-lg p-0.5"
          role="group"
        >
          {GEO_SHELF_VIEWS.map((id) => {
            const selected = activeView === id;
            return (
              <button
                aria-pressed={selected}
                className={cn(
                  "relative inline-flex h-7 items-center gap-1 rounded-md px-2 text-[0.8rem] font-medium",
                  "duration-fast transition-colors ease-out",
                  "focus-visible:ring-ring/50 focus-visible:ring-2 focus-visible:outline-none",
                  selected
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
                key={id}
                onClick={() => {
                  if (selected) {
                    return;
                  }
                  startTransition(() => {
                    setActiveView(id);
                    onViewChange(id);
                  });
                }}
                type="button"
              >
                {selected ? (
                  <m.span
                    className="bg-background absolute inset-0 rounded-md shadow-sm"
                    layoutId="shelf-view-pill"
                    transition={pillTransition}
                  />
                ) : null}
                <span className="relative z-10 inline-flex items-center gap-1">
                  <HugeiconsIcon className="size-3.5" icon={VIEW_ICONS[id]} />
                  {id === "table" ? tLabels("table") : t(`views.${id}`)}
                </span>
              </button>
            );
          })}
        </div>
      </LayoutGroup>
    </LazyMotion>
  );
}
