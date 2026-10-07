import { createFileRoute } from "@tanstack/react-router";

import { FeatureDetailPage } from "@/components/feature-pages/feature-detail-page";
import { PersonasHeadline } from "@/components/feature-pages/personas-headline";
import { PersonasStage } from "@/components/feature-pages/personas-stage";
import { PersonasTable } from "@/components/feature-pages/personas-table";
import { PERSONAS_PAGE } from "@/constants/feature-pages/personas";
import { buildFeatureDetailHead } from "@/utils/feature-detail-page";

export const Route = createFileRoute("/_site/features/personas")({
  head: () => buildFeatureDetailHead(PERSONAS_PAGE),
  component: PersonasPage,
});

function PersonasPage() {
  return (
    <FeatureDetailPage
      copy={PERSONAS_PAGE}
      overviewVisual={<PersonasTable />}
      stage={<PersonasStage />}
      title={<PersonasHeadline />}
    />
  );
}
