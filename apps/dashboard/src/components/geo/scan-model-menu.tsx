"use client";

import {
  ArrowDown01Icon,
  PlayIcon,
  Search01Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@notra/ui/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import { type KeyboardEvent, useMemo, useRef, useState } from "react";

import { Button } from "@/components/button";
import { EngineIcon } from "@/components/geo/engine-icon";
import { cn } from "@/lib/utils";
import type {
  GeoScanModelMenuProps,
  GeoScanModelOption,
} from "@/types/geo-scan-activity";
import {
  buildScanModelOptions,
  defaultScanModelSelection,
  filterScanModelOptions,
} from "@/utils/geo-scan-models";

const ROW_SELECTOR = "[data-scan-model-row]:not(:disabled)";

function focusSiblingRow(list: HTMLElement | null, delta: number) {
  const rows = [...(list?.querySelectorAll<HTMLElement>(ROW_SELECTOR) ?? [])];
  if (rows.length === 0) {
    return;
  }
  const current = document.activeElement
    ? rows.indexOf(document.activeElement as HTMLElement)
    : -1;
  if (current === -1) {
    rows[delta > 0 ? 0 : rows.length - 1]?.focus();
    return;
  }
  rows[Math.min(Math.max(current + delta, 0), rows.length - 1)]?.focus();
}

function ScanModelRow({
  option,
  checked,
  onToggle,
}: {
  option: GeoScanModelOption;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      aria-checked={checked}
      className="hover:bg-accent focus-visible:bg-accent flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-hidden disabled:cursor-not-allowed disabled:opacity-50"
      data-scan-model-row=""
      disabled={option.zdrBlocked}
      onClick={onToggle}
      role="checkbox"
      title={
        option.zdrBlocked
          ? "No zero-data-retention host. Approve it in GEO settings to scan it."
          : undefined
      }
      type="button"
    >
      <EngineIcon className="size-4" engine={option.id} />
      <span className="min-w-0 flex-1 truncate">{option.label}</span>
      {option.answerMode ? (
        <span className="text-muted-foreground text-xs">
          {option.answerMode}
        </span>
      ) : null}
      {option.zdrBlocked ? (
        <span className="text-muted-foreground text-xs">No ZDR</span>
      ) : null}
      <HugeiconsIcon
        aria-hidden="true"
        className={cn(
          "duration-instant size-4 shrink-0 transition-opacity",
          checked ? "opacity-100" : "opacity-0"
        )}
        icon={Tick02Icon}
        strokeWidth={2}
      />
    </button>
  );
}

export function ScanModelMenu({
  engines,
  catalog,
  enforceZdr,
  nonZdrApprovedEngines,
  disabled,
  disabledReason,
  compact,
  primary,
  label = "Run scan",
  onContinue,
}: GeoScanModelMenuProps) {
  const options = useMemo(
    () =>
      buildScanModelOptions({
        tracked: engines,
        catalog,
        enforceZdr,
        nonZdrApprovedEngines,
      }),
    [engines, catalog, enforceZdr, nonZdrApprovedEngines]
  );
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState(() =>
    defaultScanModelSelection(options)
  );
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const variant = primary ? "default" : "outline";

  const visible = filterScanModelOptions(options, query);
  const trackedVisible = visible.filter((option) => option.tracked);
  const otherVisible = visible.filter((option) => !option.tracked);
  const selected = options
    .filter((option) => selectedIds.has(option.id))
    .map((option) => option.id);

  if (disabled || engines.length === 0) {
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              aria-label={label}
              className="cursor-not-allowed opacity-50"
              disabled
              focusableWhenDisabled
              size={compact ? "icon" : "sm"}
              variant={compact ? "ghost" : variant}
            />
          }
        >
          <HugeiconsIcon aria-hidden="true" icon={PlayIcon} size={14} />
          {compact ? null : label}
        </TooltipTrigger>
        <TooltipContent>
          {disabledReason ??
            "Add a tracked model in GEO settings to run a scan."}
        </TooltipContent>
      </Tooltip>
    );
  }

  function toggle(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function handleListKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      focusSiblingRow(listRef.current, event.key === "ArrowDown" ? 1 : -1);
    }
  }

  const renderGroup = (title: string, items: GeoScanModelOption[]) =>
    items.length > 0 ? (
      <div className="py-1" role="group" aria-label={title}>
        <p className="text-muted-foreground px-2 pt-1 pb-1.5 text-xs">
          {title}
        </p>
        {items.map((option) => (
          <ScanModelRow
            checked={selectedIds.has(option.id)}
            key={option.id}
            onToggle={() => toggle(option.id)}
            option={option}
          />
        ))}
      </div>
    ) : null;

  return (
    <Popover
      onOpenChange={(next) => {
        if (next) {
          setQuery("");
          setSelectedIds(defaultScanModelSelection(options));
        }
        setOpen(next);
      }}
      open={open}
    >
      <PopoverTrigger
        render={
          <Button
            aria-label={label}
            className="active:scale-100"
            disabled={false}
            size={compact ? "icon" : "sm"}
            type="button"
            variant={compact ? "ghost" : variant}
          />
        }
      >
        <HugeiconsIcon aria-hidden="true" icon={PlayIcon} size={14} />
        {compact ? null : (
          <>
            {label}
            <HugeiconsIcon
              aria-hidden="true"
              icon={ArrowDown01Icon}
              size={14}
            />
          </>
        )}
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-80 max-w-[calc(100vw-2rem)] gap-0 overflow-hidden p-0"
        initialFocus={searchRef}
      >
        <div className="border-b p-1.5">
          <label className="text-muted-foreground focus-within:text-foreground flex h-8 items-center gap-2 rounded-md px-2">
            <HugeiconsIcon
              aria-hidden="true"
              className="size-4 shrink-0"
              icon={Search01Icon}
            />
            <input
              aria-label="Search models"
              className="text-foreground placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent text-sm outline-hidden"
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  focusSiblingRow(listRef.current, 1);
                }
              }}
              placeholder="Search models"
              ref={searchRef}
              type="search"
              value={query}
            />
          </label>
        </div>
        <div
          className="max-h-80 overflow-y-auto overscroll-contain px-1"
          onKeyDown={handleListKeyDown}
          ref={listRef}
        >
          {visible.length === 0 ? (
            <p className="text-muted-foreground px-2 py-6 text-center text-sm">
              No models match “{query.trim()}”
            </p>
          ) : (
            <>
              {renderGroup("Tracked", trackedVisible)}
              {renderGroup("Other models", otherVisible)}
            </>
          )}
        </div>
        <div className="border-t p-1.5">
          <Button
            className="w-full"
            disabled={selected.length === 0}
            onClick={() => {
              setOpen(false);
              onContinue(selected);
            }}
            size="sm"
            type="button"
          >
            Continue with {selected.length}{" "}
            {selected.length === 1 ? "model" : "models"}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
