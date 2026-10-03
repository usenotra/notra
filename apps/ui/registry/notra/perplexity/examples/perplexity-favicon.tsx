import { Card } from "@/components/ui/card";

import { PerplexityFavicon } from "../components/perplexity-favicon";

const DOMAINS = ["techcrunch.com", "theverge.com", "wired.com", "reuters.com"];

export default function PerplexityFaviconExample() {
  return (
    <Card className="bg-pplx-bg ring-pplx-border flex w-full min-w-0 flex-row items-center justify-center gap-3 rounded-2xl p-6">
      {DOMAINS.map((domain) => (
        <PerplexityFavicon domain={domain} key={domain} />
      ))}
      <PerplexityFavicon className="size-6" domain="axios.com" />
    </Card>
  );
}
