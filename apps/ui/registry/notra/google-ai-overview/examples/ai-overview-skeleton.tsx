import { AIOverview } from "../components/ai-overview";
import { AIOverviewHeader } from "../components/ai-overview-header";
import { AIOverviewSkeleton } from "../components/ai-overview-skeleton";

export default function AIOverviewSkeletonExample() {
  return (
    <AIOverview className="p-6" collapsible={false}>
      <AIOverviewHeader title="Searching" />
      <AIOverviewSkeleton />
    </AIOverview>
  );
}
