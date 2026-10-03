"use client";

import { Card } from "@/components/ui/card";

import { PerplexityActions } from "../components/perplexity-actions";
import { PERPLEXITY_DEMO_SOURCES } from "../constants/perplexity-demo";

export default function PerplexityActionsExample() {
  return (
    <Card className="bg-pplx-bg ring-pplx-border w-full min-w-0 gap-0 rounded-2xl p-6">
      <div className="mx-auto max-w-2xl">
        <PerplexityActions
          sources={PERPLEXITY_DEMO_SOURCES}
          text="Notion bought Skiff to build Notion Mail."
        />
      </div>
    </Card>
  );
}
