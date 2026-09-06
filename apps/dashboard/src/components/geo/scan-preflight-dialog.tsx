"use client";

import {
  GEO_SCAN_PREFLIGHT_BODY,
  GEO_SCAN_PREFLIGHT_CANCEL,
  GEO_SCAN_PREFLIGHT_CONFIRM,
  GEO_SCAN_PREFLIGHT_ENGINES_LABEL,
  GEO_SCAN_PREFLIGHT_LAST_SCAN_LABEL,
  GEO_SCAN_PREFLIGHT_NEED_ENGINE,
  GEO_SCAN_PREFLIGHT_PENDING,
  GEO_SCAN_PREFLIGHT_PROMPTS_LABEL,
  GEO_SCAN_PREFLIGHT_SELECT_ALL,
  GEO_SCAN_PREFLIGHT_TITLE,
} from "@notra/geo-core/constants/geo";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@notra/ui/components/shared/responsive-dialog";
import { useId, useState } from "react";

import { Button } from "@/components/button";
import { EngineIcon } from "@/components/geo/engine-icon";
import { Twemoji } from "@/components/geo/twemoji";
import { Checkbox } from "@/components/motion/checkbox";
import { LANGUAGE_FLAGS } from "@/constants/language-flags";
import { cn } from "@/lib/utils";
import type { ScanPreflightDialogProps } from "@/types/geo";
import { engineAnswerMode, formatEngineFamily } from "@/utils/geo-charts";
import {
  formatScanPreflightLastScan,
  scanPreflightEnginesToSubmit,
} from "@/utils/geo-scan-preflight";

function ScanPreflightEngineRow({
  engine,
  checked,
  disabled,
  selectable,
  onCheckedChange,
}: {
  engine: string;
  checked: boolean;
  disabled: boolean;
  selectable: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  const id = useId();
  const name = formatEngineFamily(engine);
  const mode = engineAnswerMode(engine);
  const identity = (
    <>
      <EngineIcon className="size-4" engine={engine} />
      <span className="min-w-0 flex-1 truncate text-sm">{name}</span>
      {mode ? (
        <span className="text-muted-foreground shrink-0 text-xs">{mode}</span>
      ) : null}
    </>
  );

  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-2.5 py-2",
        selectable && !disabled && "hover:bg-background/80"
      )}
    >
      {selectable ? (
        <label
          className={cn(
            "flex min-w-0 flex-1 items-center gap-2.5",
            disabled ? "cursor-not-allowed" : "cursor-pointer"
          )}
          htmlFor={id}
        >
          {identity}
        </label>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          {identity}
        </div>
      )}
      {selectable ? (
        <Checkbox
          aria-label={name}
          checked={checked}
          disabled={disabled}
          id={id}
          onCheckedChange={onCheckedChange}
        />
      ) : null}
    </div>
  );
}

export function ScanPreflightDialog({
  open,
  onOpenChange,
  onConfirm,
  isPending,
  promptCount,
  engines,
  languages,
  lastScanAt,
}: ScanPreflightDialogProps) {
  const selectable = engines.length > 1;
  const [deselected, setDeselected] = useState<Set<string>>(() => new Set());
  const selected = engines.filter((engine) => !deselected.has(engine));
  const selectedCount = selected.length;
  const canRun = selectedCount > 0;

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setDeselected(new Set());
    }
    onOpenChange(nextOpen);
  };

  const runScan = () => {
    if (!canRun || isPending) {
      return;
    }
    onConfirm(scanPreflightEnginesToSubmit(engines, new Set(selected)));
    setDeselected(new Set());
  };

  return (
    <ResponsiveDialog onOpenChange={handleOpenChange} open={open}>
      <ResponsiveDialogContent className="sm:max-w-md">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            {GEO_SCAN_PREFLIGHT_TITLE}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {GEO_SCAN_PREFLIGHT_BODY}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="bg-muted text-muted-foreground inline-flex items-center rounded-lg px-2 py-1 text-xs tabular-nums">
            {promptCount.toLocaleString()} {GEO_SCAN_PREFLIGHT_PROMPTS_LABEL}
          </span>
          {languages.map((language) => (
            <span
              className="bg-muted text-muted-foreground inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs"
              key={language}
            >
              <Twemoji
                className="size-3 shrink-0"
                emoji={
                  LANGUAGE_FLAGS[language as keyof typeof LANGUAGE_FLAGS] ?? ""
                }
                label={language}
              />
              {language}
            </span>
          ))}
        </div>
        <p className="text-muted-foreground text-xs">
          {GEO_SCAN_PREFLIGHT_LAST_SCAN_LABEL}{" "}
          <span className="text-foreground">
            {formatScanPreflightLastScan(lastScanAt)}
          </span>
        </p>
        <div className="min-w-0 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">
              {GEO_SCAN_PREFLIGHT_ENGINES_LABEL}
              <span className="text-muted-foreground font-normal">
                {" "}
                <span className="tabular-nums">{selectedCount}</span>
                {selectable ? ` of ${engines.length}` : null}
              </span>
            </p>
            {selectable ? (
              <Button
                disabled={isPending || selectedCount === engines.length}
                onClick={() => setDeselected(new Set())}
                size="xs"
                type="button"
                variant="ghost"
              >
                {GEO_SCAN_PREFLIGHT_SELECT_ALL}
              </Button>
            ) : null}
          </div>
          <div className="bg-muted/40 max-h-64 overflow-y-auto rounded-xl p-1">
            {engines.map((engine) => (
              <ScanPreflightEngineRow
                checked={!deselected.has(engine)}
                disabled={isPending}
                engine={engine}
                key={engine}
                onCheckedChange={(checked) => {
                  setDeselected((current) => {
                    const next = new Set(current);
                    if (checked) {
                      next.delete(engine);
                    } else {
                      next.add(engine);
                    }
                    return next;
                  });
                }}
                selectable={selectable}
              />
            ))}
          </div>
          {selectable && !canRun ? (
            <p className="text-muted-foreground text-xs">
              {GEO_SCAN_PREFLIGHT_NEED_ENGINE}
            </p>
          ) : null}
        </div>
        <ResponsiveDialogFooter>
          <Button
            disabled={isPending}
            onClick={() => handleOpenChange(false)}
            type="button"
            variant="outline"
          >
            {GEO_SCAN_PREFLIGHT_CANCEL}
          </Button>
          <Button disabled={isPending || !canRun} onClick={runScan}>
            {isPending
              ? GEO_SCAN_PREFLIGHT_PENDING
              : GEO_SCAN_PREFLIGHT_CONFIRM}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
