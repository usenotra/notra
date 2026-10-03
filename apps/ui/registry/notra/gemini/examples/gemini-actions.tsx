import { Card } from "@/components/ui/card";

import { GeminiActions } from "../components/gemini-actions";
import { GeminiStoryText } from "../components/gemini-story-text";
import { GEMINI_STORY_ASSISTANT_MESSAGES } from "../constants/gemini-story";

const [MESSAGE] = GEMINI_STORY_ASSISTANT_MESSAGES;

export default function GeminiActionsExample() {
  return (
    <Card className="border-gemini-border bg-gemini-bg font-gemini text-gemini-fg flex w-full min-w-0 flex-col items-start gap-3 overflow-hidden rounded-2xl border px-4 py-8 text-base ring-0">
      <GeminiStoryText sources={MESSAGE.sources} text={MESSAGE.text} />
      <GeminiActions className="-ms-1.5" />
    </Card>
  );
}
