import { Card } from "@/components/ui/card";

import { GeminiSparkle } from "../components/gemini-sparkle";

export default function GeminiSparkleExample() {
  return (
    <Card className="border-gemini-border bg-gemini-bg flex w-full min-w-0 flex-row items-center justify-center gap-8 overflow-hidden rounded-2xl border px-4 py-10 text-base ring-0">
      <GeminiSparkle size={24} />
      <GeminiSparkle animated size={24} />
      <GeminiSparkle animated size={40} />
    </Card>
  );
}
