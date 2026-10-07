import { GeoBar } from "@notra/ui/components/geo/geo-bar";
import { Link } from "@tanstack/react-router";

import { ReportPanel } from "@/components/state-of-ai-search/report-section";
import { Brand } from "@/components/state-of-ai-search/report-tables";
import { REPORT_LEADER_LOGOS } from "@/constants/state-of-ai-search";
import type { StateOfAiSearchReport } from "@/types/state-of-ai-search";
import { brandColor, formatPercent } from "@/utils/state-of-ai-search";

const PERCENT_MAX = 100;

export function ReportCards({ reports }: { reports: StateOfAiSearchReport[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {reports.map((report) => (
        <li className="flex" key={report.slug}>
          <Link
            className="group focus-visible:outline-ring flex flex-1 rounded-2xl outline-offset-2 focus-visible:outline-2"
            params={{ category: report.slug, edition: report.edition }}
            to="/state-of-ai-search/$category/$edition"
          >
            <ReportPanel
              className="flex-1"
              header={
                <>
                  <span className="text-foreground">{report.subject}</span>
                  <span className="ml-auto text-xs font-normal">
                    {report.editionLabel}
                  </span>
                </>
              }
            >
              <ol className="divide-border/60 divide-y">
                {report.ranking.slice(0, REPORT_LEADER_LOGOS).map((row) => (
                  <li
                    className="flex h-12 items-center gap-3 px-4 text-sm tabular-nums"
                    key={row.name}
                  >
                    <span className="text-muted-foreground w-3">
                      {row.rank}
                    </span>
                    <span className="min-w-0 flex-1">
                      <Brand domain={row.domain} name={row.name} />
                    </span>
                    <GeoBar
                      className="w-12"
                      fillColor={brandColor(row.rank)}
                      max={PERCENT_MAX}
                      value={row.visibility}
                    />
                    <span className="w-9 text-right font-medium">
                      {formatPercent(row.visibility)}
                    </span>
                  </li>
                ))}
              </ol>
              <span className="text-muted-foreground group-hover:text-foreground border-border/60 flex h-10 items-center border-t px-4 text-xs font-medium transition-colors">
                Read the {report.subject} report →
              </span>
            </ReportPanel>
          </Link>
        </li>
      ))}
    </ul>
  );
}
