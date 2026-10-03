import { createFileRoute } from "@tanstack/react-router";

import { CrawlerPagesTable } from "@/components/feature-pages/crawler-pages-table";
import { CrawlerStage } from "@/components/feature-pages/crawler-stage";
import { FeatureDetailPage } from "@/components/feature-pages/feature-detail-page";
import { AI_CRAWLER_LOGS_PAGE } from "@/constants/feature-pages/ai-crawler-logs";
import { buildFeatureDetailHead } from "@/utils/feature-detail-page";

export const Route = createFileRoute("/_site/features/ai-crawler-logs")({
  head: () => buildFeatureDetailHead(AI_CRAWLER_LOGS_PAGE),
  component: AiCrawlerLogsPage,
});

function AiCrawlerLogsPage() {
  return (
    <FeatureDetailPage
      copy={AI_CRAWLER_LOGS_PAGE}
      overviewVisual={<CrawlerPagesTable />}
      overviewVisualFirst
      stage={<CrawlerStage />}
      title={
        <>
          Know the moment
          <br />
          AI crawlers drop by.
        </>
      }
    />
  );
}
