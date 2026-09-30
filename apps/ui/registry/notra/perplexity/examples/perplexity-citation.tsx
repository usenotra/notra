import { Card } from "@/components/ui/card";

import { PerplexityCitation } from "../components/perplexity-citation";
import { PerplexityMessage } from "../components/perplexity-message";
import type { PerplexityCitationSource } from "../types/perplexity";

const TECHCRUNCH_SOURCES: PerplexityCitationSource[] = [
  {
    description:
      "Notion acquires the encrypted email and productivity startup.",
    domain: "techcrunch.com",
    title: "Notion acquires Skiff",
    url: "https://techcrunch.com/",
  },
  {
    domain: "theverge.com",
    title: "Skiff is shutting down after the Notion deal",
    url: "https://www.theverge.com/",
  },
  {
    domain: "notion.com",
    title: "Welcoming the Skiff team to Notion",
    url: "https://www.notion.com/",
  },
];

const VERGE_SOURCES = TECHCRUNCH_SOURCES.slice(1, 2);

export default function PerplexityCitationExample() {
  return (
    <Card className="bg-pplx-bg ring-pplx-border w-full min-w-0 gap-0 rounded-2xl p-6">
      <PerplexityMessage from="assistant">
        On February 9, 2024, Notion acquired the encrypted productivity startup
        Skiff.
        <PerplexityCitation
          extra={2}
          label="techcrunch"
          sources={TECHCRUNCH_SOURCES}
        />
        Skiff&apos;s services were wound down afterwards.
        <PerplexityCitation label="theverge" sources={VERGE_SOURCES} />
      </PerplexityMessage>
    </Card>
  );
}
