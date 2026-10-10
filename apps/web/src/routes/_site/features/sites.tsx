import { createFileRoute } from "@tanstack/react-router";

import { FeatureDetailPage } from "@/components/feature-pages/feature-detail-page";
import { SitesHeroStage } from "@/components/feature-pages/sites-hero-stage";
import { SitesPageBody } from "@/components/feature-pages/sites-page-body";
import {
  SITES_HERO_TITLE_LINES,
  SITES_PAGE,
} from "@/constants/feature-pages/sites";
import { buildFeatureDetailHead } from "@/utils/feature-detail-page";

export const Route = createFileRoute("/_site/features/sites")({
  head: () => buildFeatureDetailHead(SITES_PAGE),
  component: SitesPage,
});

function SitesPage() {
  const [firstLine, secondLine] = SITES_HERO_TITLE_LINES;

  return (
    <FeatureDetailPage
      copy={SITES_PAGE}
      stage={<SitesHeroStage />}
      title={
        <>
          {firstLine}
          <br />
          {secondLine}
        </>
      }
    >
      <SitesPageBody />
    </FeatureDetailPage>
  );
}
