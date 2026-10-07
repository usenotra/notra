import { Card } from "@/components/ui/card";

import { PerplexitySourcesSummary } from "../components/perplexity-sources-summary";
import { PERPLEXITY_DEMO_SOURCES } from "../constants/perplexity-demo";

export default function PerplexitySourcesSummaryExample() {
  return (
    <Card className="bg-pplx-bg ring-pplx-border flex w-full min-w-0 flex-row justify-center gap-0 rounded-2xl p-6">
      <PerplexitySourcesSummary sources={PERPLEXITY_DEMO_SOURCES} />
    </Card>
  );
}
