import { createFileRoute, notFound, redirect } from "@tanstack/react-router";

import { latestReport } from "@/lib/state-of-ai-search/reports";

/** `/state-of-ai-search/postgres` always opens the newest edition. */
export const Route = createFileRoute("/_site/state-of-ai-search/$category/")({
  beforeLoad: ({ params }) => {
    const report = latestReport(params.category);
    if (!report) {
      throw notFound();
    }
    throw redirect({
      to: "/state-of-ai-search/$category/$edition",
      params: { category: report.slug, edition: report.edition },
    });
  },
});
