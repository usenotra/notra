"use client";

import { Card } from "@/components/ui/card";

import { PerplexityComposer } from "../components/perplexity-composer";

export default function PerplexityComposerExample() {
  return (
    <Card className="bg-pplx-bg ring-pplx-border w-full min-w-0 gap-0 rounded-2xl px-4 py-6">
      <PerplexityComposer className="mx-auto max-w-3xl" />
    </Card>
  );
}
