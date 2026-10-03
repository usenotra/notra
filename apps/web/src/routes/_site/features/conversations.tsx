import { createFileRoute } from "@tanstack/react-router";

import { ConversationsStage } from "@/components/feature-pages/conversations-stage";
import { ConversationsTable } from "@/components/feature-pages/conversations-table";
import { FeatureDetailPage } from "@/components/feature-pages/feature-detail-page";
import { CONVERSATIONS_PAGE } from "@/constants/feature-pages/conversations";
import { buildFeatureDetailHead } from "@/utils/feature-detail-page";

export const Route = createFileRoute("/_site/features/conversations")({
  head: () => buildFeatureDetailHead(CONVERSATIONS_PAGE),
  component: ConversationsPage,
});

function ConversationsPage() {
  return (
    <FeatureDetailPage
      copy={CONVERSATIONS_PAGE}
      overviewVisual={<ConversationsTable />}
      overviewVisualFirst
      stage={<ConversationsStage />}
      title={
        <>
          Are you still the answer
          <br />
          at turn 3?
        </>
      }
    />
  );
}
