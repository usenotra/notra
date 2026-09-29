"use client";

import { useState } from "react";

import { Card } from "@/components/ui/card";

import { ChatgptModelSelector } from "../components/chatgpt-model-selector";
import type { ChatgptEffortId, ChatgptModelId } from "../types/chatgpt";

export default function ChatgptModelSelectorExample() {
  const [model, setModel] = useState<ChatgptModelId>("latest");
  const [effort, setEffort] = useState<ChatgptEffortId>("medium");

  return (
    <Card className="border-chatgpt-border bg-chatgpt-bg font-chatgpt text-chatgpt-fg flex w-full min-w-0 items-center justify-end gap-0 rounded-2xl border px-6 pt-36 pb-6 text-base ring-0">
      <ChatgptModelSelector
        effort={effort}
        model={model}
        onEffortChange={setEffort}
        onModelChange={setModel}
      />
    </Card>
  );
}
