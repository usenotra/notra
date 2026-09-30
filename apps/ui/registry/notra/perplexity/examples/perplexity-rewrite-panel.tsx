import { Card } from "@/components/ui/card";

import { PerplexityRewritePanel } from "../components/perplexity-rewrite-panel";

export default function PerplexityRewritePanelExample() {
  return (
    <Card className="bg-pplx-bg ring-pplx-border flex w-full min-w-0 flex-row justify-center gap-0 rounded-2xl p-6">
      <PerplexityRewritePanel className="bg-pplx-popover rounded-2xl p-1.5" />
    </Card>
  );
}
