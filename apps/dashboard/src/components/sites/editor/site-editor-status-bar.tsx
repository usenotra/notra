"use client";

import {
  Alert02Icon,
  CancelCircleIcon,
  CheckmarkCircle02Icon,
  Loading03Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useTranslations } from "use-intl";

import { Button } from "@/components/button";
import { SITE_EDITOR_LANGUAGE_LABELS } from "@/constants/site-editor";
import type { SiteEditorStatusBarProps } from "@/types/components/site-editor";

function ProblemsSummary({
  diagnostics,
  isValidating,
}: Pick<SiteEditorStatusBarProps, "diagnostics" | "isValidating">) {
  const t = useTranslations("sites.editorPage.status");
  if (isValidating) {
    return (
      <>
        <HugeiconsIcon
          aria-hidden="true"
          className="motion-safe:animate-spin"
          icon={Loading03Icon}
          size={13}
        />
        {t("checking")}
      </>
    );
  }
  if (!diagnostics) {
    return (
      <>
        <HugeiconsIcon
          aria-hidden="true"
          icon={CheckmarkCircle02Icon}
          size={13}
          strokeWidth={1.5}
        />
        {t("check")}
      </>
    );
  }
  const errors = diagnostics.filter((item) => item.severity === "error").length;
  const warnings = diagnostics.length - errors;
  if (diagnostics.length === 0) {
    return (
      <>
        <HugeiconsIcon
          aria-hidden="true"
          className="text-success"
          icon={CheckmarkCircle02Icon}
          size={13}
          strokeWidth={1.5}
        />
        {t("noProblems")}
      </>
    );
  }
  return (
    <>
      <span className="sr-only">{t("problems", { errors, warnings })}</span>
      <span aria-hidden="true" className="inline-flex items-center gap-1">
        <HugeiconsIcon
          className={errors > 0 ? "text-destructive" : undefined}
          icon={CancelCircleIcon}
          size={13}
          strokeWidth={1.5}
        />
        {errors}
      </span>
      <span aria-hidden="true" className="inline-flex items-center gap-1">
        <HugeiconsIcon
          className={warnings > 0 ? "text-warning" : undefined}
          icon={Alert02Icon}
          size={13}
          strokeWidth={1.5}
        />
        {warnings}
      </span>
    </>
  );
}

export function SiteEditorStatusBar({
  language,
  diagnostics,
  isValidating,
  problemsOpen,
  onToggleProblems,
}: SiteEditorStatusBarProps) {
  return (
    <div className="text-muted-foreground flex h-8 shrink-0 items-center justify-between gap-3 px-2.5 text-xs tabular-nums">
      <Button
        aria-expanded={diagnostics ? problemsOpen : undefined}
        className="-ms-1"
        disabled={isValidating}
        onClick={onToggleProblems}
        type="button"
        size="xs"
        variant="ghost"
      >
        <ProblemsSummary
          diagnostics={diagnostics}
          isValidating={isValidating}
        />
      </Button>
      {language ? (
        <span className="hidden sm:inline">
          {SITE_EDITOR_LANGUAGE_LABELS[language]}
        </span>
      ) : null}
    </div>
  );
}
