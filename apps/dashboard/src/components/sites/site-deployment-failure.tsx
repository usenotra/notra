"use client";

import {
  CancelCircleIcon,
  InformationCircleIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useTranslations } from "use-intl";

import { cn } from "@/lib/utils";
import type { SiteDeploymentRecordProps } from "@/types/components/sites";
import {
  siteDiagnosticLocation,
  siteDiagnosticSeverityRank,
  withDiagnosticKeys,
} from "@/utils/site-diagnostics";

export function SiteDeploymentFailure({
  deployment,
}: SiteDeploymentRecordProps) {
  if (deployment.status !== "failed" && deployment.diagnostics.length === 0) {
    return null;
  }
  const failed = deployment.status === "failed";
  return (
    <div
      className={cn(
        "rounded-xl border p-4 text-sm",
        failed
          ? "border-destructive/30 bg-destructive/5"
          : "border-warning/30 bg-warning/5"
      )}
    >
      <FailureSummary deployment={deployment} />
    </div>
  );
}

function FailureSummary({ deployment }: SiteDeploymentRecordProps) {
  const t = useTranslations("sites.deploymentPage");
  const tDiagnostics = useTranslations("sites.diagnostics");
  const diagnostics = withDiagnosticKeys(
    [...deployment.diagnostics].sort(
      (a, b) => siteDiagnosticSeverityRank(a) - siteDiagnosticSeverityRank(b)
    )
  );
  const failed = deployment.status === "failed";

  return (
    <div className="space-y-3">
      {failed ? (
        <div className="space-y-1" role="alert">
          <p className="font-medium">{t("notice.failed")}</p>
          {deployment.errorMessage && diagnostics.length === 0 ? (
            <p className="text-muted-foreground font-mono text-xs leading-5 [overflow-wrap:anywhere] whitespace-pre-wrap">
              {deployment.errorMessage}
            </p>
          ) : null}
        </div>
      ) : null}
      {diagnostics.length > 0 ? (
        <ul aria-label={t("diagnostics.title")} className="space-y-2">
          {diagnostics.map(({ diagnostic, key }) => {
            const where = siteDiagnosticLocation(diagnostic);
            const isError = diagnostic.severity === "error";
            return (
              <li
                className="grid grid-cols-[1rem_minmax(0,1fr)] gap-x-2"
                key={key}
              >
                <HugeiconsIcon
                  aria-hidden="true"
                  className={cn(
                    "mt-0.5 size-4",
                    isError ? "text-destructive" : "text-warning"
                  )}
                  icon={isError ? CancelCircleIcon : InformationCircleIcon}
                  strokeWidth={1.5}
                />
                <div className="min-w-0">
                  <p className="text-pretty">
                    <span className="sr-only">
                      {isError
                        ? tDiagnostics("error")
                        : tDiagnostics("warning")}
                      :{" "}
                    </span>
                    {diagnostic.message}
                  </p>
                  <p className="text-muted-foreground flex min-w-0 flex-wrap gap-x-3 font-mono text-xs">
                    {where ? (
                      <span className="[overflow-wrap:anywhere]">{where}</span>
                    ) : null}
                    <span>{diagnostic.code}</span>
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
