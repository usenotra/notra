import { Card } from "@/components/ui/card";

import { PerplexityMessage } from "../components/perplexity-message";
import { PerplexityUserActions } from "../components/perplexity-user-actions";

const QUESTION = "who did notion buy to build notion mail?";

export default function PerplexityUserActionsExample() {
  return (
    <Card className="bg-pplx-bg ring-pplx-border flex w-full min-w-0 flex-col gap-6 rounded-2xl p-6">
      <PerplexityMessage
        actions={<PerplexityUserActions text={QUESTION} timestamp="09:18" />}
        from="user"
      >
        {QUESTION}
      </PerplexityMessage>
    </Card>
  );
}
