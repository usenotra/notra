import { Card } from "@/components/ui/card";

import { PerplexitySearch } from "../components/perplexity-search";
import {
  PERPLEXITY_DEMO_QUERIES,
  PERPLEXITY_DEMO_SOURCES,
} from "../constants/perplexity-demo";

export default function PerplexitySearchExample() {
  return (
    <Card className="bg-pplx-bg ring-pplx-border w-full min-w-0 gap-0 rounded-2xl p-6">
      <PerplexitySearch
        defaultOpen
        duration="1s"
        previewCount={3}
        queries={PERPLEXITY_DEMO_QUERIES.slice(0, 1)}
        sources={PERPLEXITY_DEMO_SOURCES}
        stepDefaultOpen
      />
    </Card>
  );
}
