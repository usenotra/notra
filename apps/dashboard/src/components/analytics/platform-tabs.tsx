"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import { SPRING } from "@notra/ui/lib/motion";
import { AnimatePresence, domMax, LazyMotion, m } from "motion/react";
import { useId } from "react";
import { useTranslations } from "use-intl";

import { cn } from "@/lib/utils";
import type { PlatformTabItem, PlatformTabsProps } from "@/types/analytics";

const TAB_CLASS =
  "relative flex shrink-0 cursor-pointer items-center rounded-xl px-2.5 py-1.5 outline-none transition-colors duration-normal ease-out focus-visible:ring-2 focus-visible:ring-ring";

const LABEL_CLASS = "whitespace-nowrap font-medium text-foreground text-sm";

function PlatformTab({
  item,
  isActive,
  layoutId,
  onSelect,
}: {
  item: PlatformTabItem;
  isActive: boolean;
  layoutId: string;
  onSelect: (value: string) => void;
}) {
  const alwaysVisible = item.collapsedLabel !== undefined;
  const text = isActive ? item.label : (item.collapsedLabel ?? item.label);

  const inner = (
    <>
      {isActive && (
        <m.span
          className="bg-background ring-border absolute inset-0 rounded-xl shadow-sm ring-1"
          layoutId={layoutId}
          transition={SPRING.indicator}
        />
      )}
      <span className="relative z-10 flex items-center gap-1.5">
        {item.icon}
        {alwaysVisible ? (
          <m.span className={LABEL_CLASS} layout transition={SPRING.indicator}>
            {text}
          </m.span>
        ) : (
          <AnimatePresence initial={false}>
            {isActive && (
              <m.span
                animate={{ width: "auto", opacity: 1 }}
                className={cn("overflow-hidden", LABEL_CLASS)}
                exit={{ width: 0, opacity: 0 }}
                initial={{ width: 0, opacity: 0 }}
                transition={SPRING.indicator}
              >
                <span className="block">{item.label}</span>
              </m.span>
            )}
          </AnimatePresence>
        )}
      </span>
    </>
  );

  const button = (
    <m.button
      aria-pressed={isActive}
      className={TAB_CLASS}
      layout
      onClick={() => onSelect(item.value)}
      transition={SPRING.indicator}
      type="button"
    >
      {inner}
    </m.button>
  );

  if (alwaysVisible || isActive) {
    return button;
  }

  return (
    <Tooltip>
      <TooltipTrigger render={button} />
      <TooltipContent>{item.label}</TooltipContent>
    </Tooltip>
  );
}

export function PlatformTabs({
  items,
  value,
  onValueChange,
  label,
  className,
}: PlatformTabsProps) {
  const tCommon = useTranslations("common");
  const layoutId = useId();

  return (
    <LazyMotion features={domMax}>
      <menu
        aria-label={label ?? tCommon("labels.filter")}
        className={cn(
          "bg-muted/50 m-0 flex list-none items-center gap-1 rounded-2xl border p-1",
          className
        )}
      >
        {items.map((item) => (
          <PlatformTab
            isActive={item.value === value}
            item={item}
            key={item.value}
            layoutId={layoutId}
            onSelect={onValueChange}
          />
        ))}
      </menu>
    </LazyMotion>
  );
}
