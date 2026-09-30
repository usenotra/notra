import { Card } from "@/components/ui/card";

import { PerplexityModelIcon } from "../components/perplexity-model-icon";
import type { PerplexityModelProvider } from "../types/perplexity";

const PROVIDERS: PerplexityModelProvider[] = [
  "perplexity",
  "openai",
  "google",
  "anthropic",
  "kimi",
  "zhipu",
  "xai",
  "nvidia",
];

export default function PerplexityModelIconExample() {
  return (
    <Card className="bg-pplx-bg ring-pplx-border flex w-full min-w-0 flex-row items-center justify-center gap-4 rounded-2xl p-6">
      {PROVIDERS.map((provider) => (
        <PerplexityModelIcon
          aria-label={provider}
          key={provider}
          provider={provider}
          role="img"
        />
      ))}
    </Card>
  );
}
