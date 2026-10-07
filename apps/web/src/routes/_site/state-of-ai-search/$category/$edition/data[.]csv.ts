import { createFileRoute } from "@tanstack/react-router";

import { findReport } from "@/lib/state-of-ai-search/reports";
import { buildReportCsv } from "@/utils/state-of-ai-search";

function GET({ params }: { params: { category: string; edition: string } }) {
  const report = findReport(params.category, params.edition);
  if (!report) {
    return new Response("Not found", { status: 404 });
  }
  return new Response(buildReportCsv(report), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="state-of-ai-search-${report.slug}-${report.edition}.csv"`,
      "cache-control": "public, max-age=3600",
    },
  });
}

export const Route = createFileRoute(
  "/_site/state-of-ai-search/$category/$edition/data.csv"
)({
  server: { handlers: { GET } },
});
