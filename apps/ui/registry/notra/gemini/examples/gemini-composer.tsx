import { Card } from "@/components/ui/card";

import { GeminiComposer } from "../components/gemini-composer";

export default function GeminiComposerExample() {
  return (
    <Card className="border-gemini-border bg-gemini-bg w-full min-w-0 overflow-hidden rounded-2xl border px-4 py-6 text-base ring-0">
      <GeminiComposer className="mx-auto max-w-3xl" />
    </Card>
  );
}
