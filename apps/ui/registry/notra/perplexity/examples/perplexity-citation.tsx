import { Card } from "@/components/ui/card";

import { PerplexityCitation } from "../components/perplexity-citation";
import { PerplexityMessage } from "../components/perplexity-message";

export default function PerplexityCitationExample() {
  return (
    <Card className="bg-pplx-bg ring-pplx-border w-full min-w-0 gap-0 rounded-2xl p-6">
      <PerplexityMessage from="assistant">
        On February 9, 2024, Notion acquired the encrypted productivity startup
        Skiff.
        <PerplexityCitation extra={2} label="techcrunch" />
        Skiff&apos;s services were wound down afterwards.
        <PerplexityCitation label="theverge" />
      </PerplexityMessage>
    </Card>
  );
}
