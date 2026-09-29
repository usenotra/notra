import { Card } from "@/components/ui/card";

import { GeminiThinking } from "../components/gemini-thinking";

export default function GeminiThinkingExample() {
  return (
    <Card className="border-gemini-border bg-gemini-bg flex w-full min-w-0 flex-col gap-6 overflow-hidden rounded-2xl border px-4 py-8 text-base ring-0">
      <GeminiThinking />
      <GeminiThinking label="Thinking" />
    </Card>
  );
}
