import { Card } from "@/components/ui/card";

import { PerplexityMessage } from "../components/perplexity-message";

export default function PerplexityMessageExample() {
  return (
    <Card className="bg-pplx-bg ring-pplx-border flex w-full min-w-0 flex-col gap-6 rounded-2xl p-6">
      <PerplexityMessage from="user">
        who did notion buy to build notion mail?
      </PerplexityMessage>
      <PerplexityMessage from="assistant">
        Notion bought Skiff, the team and technology behind what later became
        Notion Mail.
      </PerplexityMessage>
    </Card>
  );
}
