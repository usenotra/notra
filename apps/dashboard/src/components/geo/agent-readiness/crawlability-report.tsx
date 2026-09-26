import { CRAWLABILITY_RESULT_ORDER } from "@notra/geo-core/constants/crawlability";

import { InstrumentModule } from "@/components/instrument/instrument-module";
import type { CrawlabilityReportCardProps } from "@/types/agent-readiness";

export function CrawlabilityReportCard({
  report,
}: CrawlabilityReportCardProps) {
  return (
    <InstrumentModule eyebrow="Crawler access and readability" variant="table">
      <div className="space-y-4">
        <p className="text-muted-foreground text-sm">
          Published crawler rules and public page responses. A passing check
          does not guarantee indexing or AI citations. Requests come from Notra,
          not verified Google or AI crawler IPs, and do not execute JavaScript.
        </p>
        {report ? (
          <>
            <p className="text-muted-foreground text-xs">
              {report.pages.length} pages checked · {report.checkedAt}
            </p>
            <details className="text-muted-foreground text-sm">
              <summary className="cursor-pointer">Sample coverage</summary>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {report.discovery.map((note, index) => (
                  <li key={`${index}-${note}`}>{note}</li>
                ))}
              </ul>
            </details>
            <div className="divide-y">
              {report.pages.map((page) => {
                const blocked = page.checks.filter(
                  (check) => check.result === "blocked"
                ).length;
                const unknown = page.checks.filter(
                  (check) => check.result === "unknown"
                ).length;
                const review = page.checks.filter(
                  (check) => check.result === "review"
                ).length;
                return (
                  <details key={page.url} className="py-3">
                    <summary className="cursor-pointer text-sm">
                      <span className="font-medium break-all">{page.url}</span>
                      <span className="text-muted-foreground ml-2">
                        {blocked} blocked · {review} to review · {unknown}{" "}
                        unknown
                      </span>
                    </summary>
                    <div className="mt-3 space-y-4 pl-4">
                      {page.checks
                        .toSorted(
                          (left, right) =>
                            CRAWLABILITY_RESULT_ORDER[left.result] -
                            CRAWLABILITY_RESULT_ORDER[right.result]
                        )
                        .map((check) => (
                          <div key={check.id} className="text-sm">
                            <h3 className="font-medium">
                              {check.name}{" "}
                              <span className="text-muted-foreground font-normal">
                                — {check.result}
                              </span>
                            </h3>
                            <p className="text-muted-foreground mt-1 break-words">
                              {check.evidence}
                            </p>
                            {check.recommendation ? (
                              <p className="mt-1">{check.recommendation}</p>
                            ) : null}
                          </div>
                        ))}
                    </div>
                  </details>
                );
              })}
            </div>
            <p className="text-muted-foreground text-xs">
              These checks are separate from the Is Agentic score. Review
              intentional exclusions before changing access rules.
            </p>
          </>
        ) : (
          <p className="text-muted-foreground text-sm">
            Crawler access has not been checked in this report. Run a new scan
            to include it.
          </p>
        )}
      </div>
    </InstrumentModule>
  );
}
