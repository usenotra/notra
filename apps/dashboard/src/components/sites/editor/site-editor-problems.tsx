"use client";

import {
  Alert02Icon,
  Cancel01Icon,
  CancelCircleIcon,
  CheckmarkCircle02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useTranslations } from "use-intl";

import { Button } from "@/components/button";
import { cn } from "@/lib/utils";
import type { SiteEditorProblemsProps } from "@/types/components/site-editor";
import {
  siteDiagnosticLocation,
  withDiagnosticKeys,
  siteDiagnosticSeverityRank,
} from "@/utils/site-diagnostics";

export function SiteEditorProblems({
  diagnostics,
  onSelect,
  onClose,
}: SiteEditorProblemsProps) {
  const t = useTranslations("sites.editorPage.problems");
  const tDiagnostics = useTranslations("sites.diagnostics");
  const sorted = [...diagnostics].sort(
    (a, b) => siteDiagnosticSeverityRank(a) - siteDiagnosticSeverityRank(b)
  );

  return (
    <section
      aria-label={t("title")}
      aria-live="polite"
      className="flex max-h-[45%] min-h-28 shrink-0 flex-col border-t"
    >
      <div className="flex h-9 shrink-0 items-center justify-between gap-2 ps-3 pe-1.5">
        <h2 className="flex items-center gap-2 text-xs font-medium">
          {t("title")}
          <span className="bg-muted text-muted-foreground rounded-full px-1.5 text-[11px] tabular-nums">
            {diagnostics.length}
          </span>
        </h2>
        <Button
          aria-label={t("close")}
          onClick={onClose}
          size="icon-xs"
          variant="ghost"
        >
          <HugeiconsIcon icon={Cancel01Icon} size={13} />
        </Button>
      </div>
      {sorted.length === 0 ? (
        <p className="text-muted-foreground flex flex-1 items-center justify-center gap-1.5 pb-3 text-[13px]">
          <HugeiconsIcon
            aria-hidden="true"
            className="text-success"
            icon={CheckmarkCircle02Icon}
            size={15}
            strokeWidth={1.5}
          />
          {t("none")}
        </p>
      ) : (
        <ul className="min-h-0 flex-1 overflow-y-auto px-1.5 pb-1.5">
          {withDiagnosticKeys(sorted).map(({ diagnostic, key }) => {
            const isError = diagnostic.severity === "error";
            const where = siteDiagnosticLocation(diagnostic);
            const row = (
              <>
                <HugeiconsIcon
                  aria-hidden="true"
                  className={cn(
                    "mt-0.5 shrink-0",
                    isError ? "text-destructive" : "text-warning"
                  )}
                  icon={isError ? CancelCircleIcon : Alert02Icon}
                  size={14}
                  strokeWidth={1.5}
                />
                <span className="min-w-0 flex-1 text-pretty">
                  <span className="sr-only">
                    {isError ? tDiagnostics("error") : tDiagnostics("warning")}
                    :{" "}
                  </span>
                  {diagnostic.message}
                </span>
                {where ? (
                  <span className="text-muted-foreground max-w-[45%] shrink-0 truncate font-mono text-xs">
                    {where}
                  </span>
                ) : null}
              </>
            );
            return (
              <li key={key}>
                {diagnostic.file ? (
                  <button
                    className="hover:bg-muted flex w-full items-start gap-2.5 rounded-md px-2 py-1.5 text-left text-[13px] transition-colors duration-150"
                    onClick={() => onSelect(diagnostic)}
                    title={where ?? undefined}
                    type="button"
                  >
                    {row}
                  </button>
                ) : (
                  <div className="flex items-start gap-2.5 px-2 py-1.5 text-[13px]">
                    {row}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
