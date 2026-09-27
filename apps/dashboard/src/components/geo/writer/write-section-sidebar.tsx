"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import {
  GEO_WRITE_PANEL_HEADER_CLASS,
  GEO_WRITE_PANEL_HEADER_ROW_CLASS,
  GEO_WRITE_SIDEBAR_WIDTH,
} from "@notra/geo-core/constants/geo";
import { cn } from "@notra/ui/lib/utils";
import { useTranslations } from "next-intl";

import { GEO_WRITE_DIALOG_SECTIONS } from "@/constants/geo-writer";
import { useWriteSectionLabels } from "@/lib/hooks/use-write-section-labels";
import type { WriteSectionSidebarProps } from "@/types/components/geo-writer";

export function WriteSectionSidebar({
  activeSection,
  collapsed,
  onJump,
}: WriteSectionSidebarProps) {
  const t = useTranslations("geo.writer.writeSectionSidebar");
  const sectionLabels = useWriteSectionLabels();
  const tCommon = useTranslations("common");
  return (
    <nav
      aria-hidden={collapsed}
      aria-label={t("ariaLabel")}
      className={cn(
        "duration-slow hidden shrink-0 flex-col overflow-hidden transition-[width,margin-right,opacity] ease-out will-change-[width] motion-reduce:transition-none md:flex",
        collapsed ? "-mr-3 w-0 opacity-0" : "mr-0 opacity-100"
      )}
      style={{ width: collapsed ? undefined : GEO_WRITE_SIDEBAR_WIDTH }}
    >
      <div
        className="flex min-h-0 flex-1 flex-col"
        style={{ width: GEO_WRITE_SIDEBAR_WIDTH }}
      >
        <div className={GEO_WRITE_PANEL_HEADER_CLASS}>
          <p
            className={cn(
              GEO_WRITE_PANEL_HEADER_ROW_CLASS,
              "text-muted-foreground px-4 text-xs"
            )}
          >
            {tCommon("labels.overview")}
          </p>
        </div>
        <div className="border-border bg-background -mt-5 flex min-h-0 flex-1 flex-col gap-0.5 rounded-2xl border p-2">
          {GEO_WRITE_DIALOG_SECTIONS.map((item) => {
            const active = activeSection === item.id;
            return (
              <button
                aria-current={active ? "location" : undefined}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors",
                  active
                    ? "bg-muted text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )}
                key={item.id}
                onClick={() => onJump(item.id)}
                tabIndex={collapsed ? -1 : undefined}
                type="button"
              >
                <HugeiconsIcon
                  className="size-4"
                  icon={item.icon}
                  strokeWidth={1.8}
                />
                <span>{sectionLabels[item.id]}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
