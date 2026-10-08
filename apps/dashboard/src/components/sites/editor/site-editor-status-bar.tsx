"use client";

import {
  Alert02Icon,
  CancelCircleIcon,
  CheckmarkCircle02Icon,
  Loading03Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useTranslations } from "use-intl";

import { SITE_EDITOR_LANGUAGE_LABELS } from "@/constants/site-editor";
import { cn } from "@/lib/utils";
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
      <button
        aria-expanded={diagnostics ? problemsOpen : undefined}
        className={cn(
          "hover:bg-background/70 hover:text-foreground focus-visible:ring-ring/50 -ms-1 inline-flex h-6 items-center gap-2.5 rounded-md px-1.5 transition-colors duration-150 outline-none focus-visible:ring-[3px] disabled:pointer-events-none",
          problemsOpen && "bg-background/70 text-foreground"
        )}
        disabled={isValidating}
        onClick={onToggleProblems}
        type="button"
      >
        <ProblemsSummary
          diagnostics={diagnostics}
          isValidating={isValidating}
        />
      </button>
      {language ? (
        <span className="hidden sm:inline">
          {SITE_EDITOR_LANGUAGE_LABELS[language]}
        </span>
      ) : null}
    </div>
  );
}
