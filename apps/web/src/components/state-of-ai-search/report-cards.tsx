import { Link } from "@tanstack/react-router";

import { ReportPanel } from "@/components/state-of-ai-search/report-section";
import {
  LeaderList,
  ReadReportRow,
} from "@/components/state-of-ai-search/report-ui";
import { REPORT_LEADER_LOGOS } from "@/constants/state-of-ai-search";
import type { StateOfAiSearchSummary } from "@/types/state-of-ai-search";

export function ReportCards({
  reports,
}: {
  reports: StateOfAiSearchSummary[];
}) {
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
              <LeaderList
                leaders={report.leaders.slice(0, REPORT_LEADER_LOGOS)}
              />
              <ReadReportRow subject={report.subject} />
            </ReportPanel>
          </Link>
        </li>
      ))}
    </ul>
  );
}
