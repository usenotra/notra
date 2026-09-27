"use client";

import {
  AnimatePresence,
  domMax,
  LazyMotion,
  m,
  useReducedMotion,
} from "motion/react";
import { type ReactNode, useId, useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import { useUiLabels } from "@notra/ui/components/shared/ui-labels-provider";
import { SPRING } from "@notra/ui/lib/motion";
import { cn } from "@notra/ui/lib/utils";

interface ExpandableTabsItem {
  value: string;
  label: string;
  icon: ReactNode;
  href?: string;
}

interface ExpandableTabsProps {
  items: ExpandableTabsItem[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  label?: string;
  className?: string;
}

interface ExpandableTabProps {
  item: ExpandableTabsItem;
  isActive: boolean;
  layoutId: string;
  onSelect: (value: string) => void;
}

function ExpandableTab({
  item,
  isActive,
  layoutId,
  onSelect,
}: ExpandableTabProps) {
  const reduceMotion = useReducedMotion();
  const transition = reduceMotion ? { duration: 0 } : SPRING.indicator;
  const tabClassName =
    "relative flex shrink-0 cursor-pointer items-center rounded-xl p-2 outline-none transition-colors duration-normal ease-out focus-visible:ring-2 focus-visible:ring-ring";

  const content = (
    <>
      {isActive && (
        <m.span
          className="absolute inset-0 rounded-xl bg-background shadow-sm ring-1 ring-border"
          layoutId={layoutId}
          transition={transition}
        />
      )}
      <span className="relative z-10 flex items-center">
        {item.icon}
        <AnimatePresence initial={false}>
          {isActive && (
            <m.span
              animate={{ width: "auto", opacity: 1 }}
              className="overflow-hidden whitespace-nowrap font-medium text-foreground text-sm"
              exit={{ width: 0, opacity: 0 }}
              initial={{ width: 0, opacity: 0 }}
              transition={transition}
            >
              <span className="block pr-1 pl-2">{item.label}</span>
            </m.span>
          )}
        </AnimatePresence>
      </span>
    </>
  );

  return (
    <Tooltip disabled={isActive}>
      <TooltipTrigger
        render={
          item.href ? (
            <a
              aria-current={isActive ? "page" : undefined}
              className={tabClassName}
              href={item.href}
            >
              {content}
            </a>
          ) : (
            <button
              aria-pressed={isActive}
              className={tabClassName}
              onClick={() => onSelect(item.value)}
              type="button"
            >
              {content}
            </button>
          )
        }
      />
      <TooltipContent>{item.label}</TooltipContent>
    </Tooltip>
  );
}

export function ExpandableTabs({
  items,
  value,
  defaultValue,
  onValueChange,
  label,
  className,
}: ExpandableTabsProps) {
  const labels = useUiLabels();
  const layoutId = useId();
  const [internalValue, setInternalValue] = useState(
    defaultValue ?? items[0]?.value
  );
  const activeValue = value ?? internalValue;

  const handleSelect = (next: string) => {
    setInternalValue(next);
    onValueChange?.(next);
  };

  return (
    <div className="flex justify-center">
      <LazyMotion features={domMax}>
        <menu
          aria-label={label ?? labels.chooseOption}
          className={cn(
            "m-0 flex max-w-full list-none items-center gap-1.5 overflow-x-auto overscroll-none rounded-2xl border bg-muted/50 p-1.5 [scrollbar-width:none] sm:flex-wrap sm:justify-center sm:overflow-visible [&::-webkit-scrollbar]:hidden",
            className
          )}
        >
          {items.map((item) => (
            <ExpandableTab
              isActive={item.value === activeValue}
              item={item}
              key={item.value}
              layoutId={layoutId}
              onSelect={handleSelect}
            />
          ))}
        </menu>
      </LazyMotion>
    </div>
  );
}

export type { ExpandableTabsItem, ExpandableTabsProps };
