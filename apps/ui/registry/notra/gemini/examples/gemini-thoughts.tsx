import { Card } from "@/components/ui/card";

import { GeminiThoughts } from "../components/gemini-thoughts";
import { GEMINI_STORY_THOUGHTS } from "../constants/gemini-story";

export default function GeminiThoughtsExample() {
  return (
    <Card className="border-gemini-border bg-gemini-bg font-gemini flex w-full min-w-0 flex-col gap-4 overflow-hidden rounded-2xl border px-5 py-6 text-base ring-0">
      <GeminiThoughts defaultOpen steps={GEMINI_STORY_THOUGHTS} />
    </Card>
  );
}
