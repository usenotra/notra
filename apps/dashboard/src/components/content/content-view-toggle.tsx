"use client";

import {
  Calendar03Icon,
  GridViewIcon,
  ListViewIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useTranslations } from "next-intl";

import { CONTENT_LIST_VIEWS } from "@/constants/content-collections";
import { cn } from "@/lib/utils";
import type {
  ContentListView,
  ContentViewToggleProps,
} from "@/types/content/collection";

const VIEW_ICONS = {
  list: ListViewIcon,
  grid: GridViewIcon,
  calendar: Calendar03Icon,
} as const satisfies Record<ContentListView, unknown>;

export function ContentViewToggle({
  view,
  onViewChange,
}: ContentViewToggleProps) {
  const t = useTranslations("content.list");
  const tCommon = useTranslations("common");
  const labels: Record<ContentListView, string> = {
    list: tCommon("labels.list"),
    grid: t("viewGrid"),
    calendar: t("viewCalendar"),
  };

  return (
    <div
      aria-label={t("viewToggle")}
      className="bg-muted inline-flex items-center rounded-lg p-0.5"
      role="group"
    >
      {CONTENT_LIST_VIEWS.map((option) => {
        const selected = view === option;

        return (
          <button
            aria-pressed={selected}
            className={cn(
              "focus-visible:ring-ring/50 duration-fast inline-flex h-7 items-center gap-1 rounded-md px-2 text-[0.8rem] font-medium transition-colors ease-out focus-visible:ring-2 focus-visible:outline-none",
              selected
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
            key={option}
            onClick={() => onViewChange(option)}
            type="button"
          >
            <HugeiconsIcon
              aria-hidden="true"
              className="size-3.5"
              icon={VIEW_ICONS[option]}
            />
            {labels[option]}
          </button>
        );
      })}
    </div>
  );
}
