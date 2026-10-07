"use client";

import { useState } from "react";

import { ClaudeModelSelector } from "../components/claude-model-selector";
import type { ClaudeEffortId, ClaudeModelId } from "../types/claude";

export default function ClaudeModelSelectorExample() {
  const [model, setModel] = useState<ClaudeModelId>("opus-5.5");
  const [effort, setEffort] = useState<ClaudeEffortId>("high");

  return (
    <div className="bg-claude-bg flex justify-center p-6 pt-44 pb-36">
      <ClaudeModelSelector
        effort={effort}
        model={model}
        onEffortChange={setEffort}
        onModelChange={setModel}
      />
    </div>
  );
}
