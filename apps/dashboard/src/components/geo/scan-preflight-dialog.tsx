"use client";

import { PlayIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@notra/ui/components/shared/responsive-dialog";
import { useLocale, useTranslations } from "next-intl";
import { useId, useState } from "react";

import { Button } from "@/components/button";
import { EngineIcon } from "@/components/geo/engine-icon";
import { Twemoji } from "@/components/geo/twemoji";
import { Checkbox } from "@/components/motion/checkbox";
import { GEO_ENGINE_ANSWER_MODE_LABEL_KEYS } from "@/constants/geo-models";
import { LANGUAGE_FLAGS } from "@/constants/language-flags";
import { useFormatRelative } from "@/lib/hooks/use-format-relative";
import { useGeoScanEstimate } from "@/lib/hooks/use-geo-scan-estimate";
import { useLanguageLabel } from "@/lib/hooks/use-language-label";
import { cn } from "@/lib/utils";
import type { ScanPreflightDialogProps } from "@/types/geo";
import { engineAnswerMode, formatEngineFamily } from "@/utils/geo-charts";
import { scanPreflightEnginesToSubmit } from "@/utils/geo-scan-preflight";

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
  const tGeoShared = useTranslations("geo.shared");
  const answerMode = engineAnswerMode(engine);
  const mode = answerMode
    ? tGeoShared(GEO_ENGINE_ANSWER_MODE_LABEL_KEYS[answerMode])
    : null;
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

function ScanPreflightHeader({
  prompt,
  confirmationOnly,
}: {
  prompt?: string;
  confirmationOnly: boolean;
}) {
  const t = useTranslations("geo.scanPreflightDialog");
  const title = prompt ? t("promptTitle") : t("title");
  const description = prompt ? t("promptBody") : t("body");
  return (
    <ResponsiveDialogHeader>
      <ResponsiveDialogTitle className="flex items-center gap-2">
        {confirmationOnly ? t("confirmTitle") : title}
      </ResponsiveDialogTitle>
      <ResponsiveDialogDescription>
        {confirmationOnly ? t("confirmBody") : description}
      </ResponsiveDialogDescription>
    </ResponsiveDialogHeader>
  );
}

export function ScanPreflightDialog({
  organizationId,
  open,
  onOpenChange,
  onConfirm,
  isPending,
  promptCount,
  engines,
  languages,
  lastScanAt,
  prompt,
  confirmationOnly = false,
}: ScanPreflightDialogProps) {
  const t = useTranslations("geo.scanPreflightDialog");
  const languageLabel = useLanguageLabel();
  const tGeoShared = useTranslations("geo.shared");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const formatRelative = useFormatRelative();
  const selectable = !confirmationOnly && engines.length > 1;
  const [deselected, setDeselected] = useState<Set<string>>(() => new Set());
  const selected = engines.filter((engine) => !deselected.has(engine));
  const selectedCount = selected.length;
  const allSelected = selectedCount === engines.length;
  const canRun = selectedCount > 0;

  const { scanSize } = useGeoScanEstimate({
    organizationId,
    promptCount,
    engines: selected,
    languages,
    includeSequences: !prompt,
  });

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
    if (!prompt) {
      setDeselected(new Set());
    }
  };

  return (
    <ResponsiveDialog onOpenChange={handleOpenChange} open={open}>
      <ResponsiveDialogContent className="sm:max-w-md">
        <ScanPreflightHeader
          prompt={prompt}
          confirmationOnly={confirmationOnly}
        />
        {prompt ? <p className="text-sm font-medium">{prompt}</p> : null}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="bg-muted text-muted-foreground inline-flex items-center rounded-lg px-2 py-1 text-xs tabular-nums">
            {promptCount === undefined
              ? t("promptCountUnknown")
              : tGeoShared("countPluralOnePromptOther", { count: promptCount })}
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
                label={languageLabel(language)}
              />
              {languageLabel(language)}
            </span>
          ))}
          <span className="bg-muted text-muted-foreground inline-flex items-center rounded-lg px-2 py-1 text-xs tabular-nums">
            {scanSize === null
              ? t("calculating")
              : t("estimatedChecks", {
                  count: scanSize.toLocaleString(locale),
                })}
          </span>
        </div>
        <p className="text-muted-foreground text-xs">
          {t("lastScan")}{" "}
          <span className="text-foreground">
            {lastScanAt ? formatRelative(lastScanAt) : tCommon("labels.notYet")}
          </span>
        </p>
        <div className="min-w-0 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">
              {tGeoShared("engines")}
              <span className="text-muted-foreground font-normal">
                {" "}
                <span className="tabular-nums">
                  {selectable
                    ? t("selectedOf", {
                        selected: selectedCount,
                        total: engines.length,
                      })
                    : selectedCount}
                </span>
              </span>
            </p>
            {selectable ? (
              <Button
                disabled={isPending}
                onClick={() =>
                  setDeselected(
                    allSelected ? new Set(engines) : new Set<string>()
                  )
                }
                size="xs"
                type="button"
                variant="ghost"
              >
                {allSelected ? t("deselectAll") : tGeoShared("selectAll")}
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
            <p className="text-muted-foreground text-xs">{t("needEngine")}</p>
          ) : null}
        </div>
        {confirmationOnly ? (
          <p className="text-muted-foreground text-sm">{t("followProgress")}</p>
        ) : null}
        <ResponsiveDialogFooter>
          <Button
            disabled={isPending}
            onClick={() => handleOpenChange(false)}
            type="button"
            variant="outline"
          >
            {tCommon("actions.cancel")}
          </Button>
          <Button disabled={isPending || !canRun} onClick={runScan}>
            <HugeiconsIcon aria-hidden="true" icon={PlayIcon} size={14} />
            {isPending ? tCommon("labels.starting") : tGeoShared("runScan")}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
