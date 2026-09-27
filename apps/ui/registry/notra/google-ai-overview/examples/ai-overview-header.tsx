import { AIOverview } from "../components/ai-overview";
import { AIOverviewHeader } from "../components/ai-overview-header";

export default function AIOverviewHeaderExample() {
  return (
    <AIOverview className="p-6" collapsible={false}>
      <AIOverviewHeader />
      <AIOverviewHeader title="An AI Overview is not available for this search" />
    </AIOverview>
  );
}
