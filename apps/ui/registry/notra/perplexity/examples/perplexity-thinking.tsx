import { Card } from "@/components/ui/card";

import { PerplexityThinking } from "../components/perplexity-thinking";

export default function PerplexityThinkingExample() {
  return (
    <Card className="bg-pplx-bg ring-pplx-border w-full min-w-0 gap-0 rounded-2xl p-6">
      <PerplexityThinking />
    </Card>
  );
}
