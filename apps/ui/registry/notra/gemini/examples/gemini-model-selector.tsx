"use client";

import { useState } from "react";

import { Card } from "@/components/ui/card";

import { GeminiModelSelector } from "../components/gemini-model-selector";
import { getGeminiModel } from "../lib/gemini-model";
import type { GeminiModelId } from "../types/gemini";

export default function GeminiModelSelectorExample() {
  const [model, setModel] = useState<GeminiModelId>("flash");

  return (
    <Card className="border-gemini-border bg-gemini-bg font-gemini text-gemini-muted flex w-full min-w-0 flex-col items-center gap-3 overflow-hidden rounded-2xl border px-4 pt-64 pb-8 text-sm ring-0">
      <GeminiModelSelector model={model} onModelChange={setModel} />
      <p aria-live="polite">Selected: {getGeminiModel(model).label}</p>
    </Card>
  );
}
