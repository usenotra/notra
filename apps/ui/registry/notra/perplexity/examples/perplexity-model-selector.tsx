"use client";

import { useState } from "react";

import { Card } from "@/components/ui/card";

import { PerplexityModelSelector } from "../components/perplexity-model-selector";
import { PERPLEXITY_MODELS } from "../constants/perplexity";

const MODELS = PERPLEXITY_MODELS.map((model, index) =>
  index < 3 ? { ...model, locked: false } : model
);

export default function PerplexityModelSelectorExample() {
  const [model, setModel] = useState("sonar-2");

  return (
    <Card className="bg-pplx-bg ring-pplx-border flex w-full min-w-0 flex-row justify-center gap-0 rounded-2xl p-6 pt-24">
      <PerplexityModelSelector
        model={model}
        models={MODELS}
        onModelChange={setModel}
      />
    </Card>
  );
}
