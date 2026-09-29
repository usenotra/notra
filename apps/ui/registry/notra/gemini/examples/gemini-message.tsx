import { Card } from "@/components/ui/card";

import { GeminiMessage } from "../components/gemini-message";
import { GeminiStoryText } from "../components/gemini-story-text";
import { GEMINI_STORY_THREAD } from "../constants/gemini-story";

export default function GeminiMessageExample() {
  return (
    <Card className="border-gemini-border bg-gemini-bg flex w-full min-w-0 flex-col gap-8 overflow-hidden rounded-2xl border px-4 py-8 text-base ring-0">
      {GEMINI_STORY_THREAD.map((message) => (
        <GeminiMessage from={message.from} key={message.id}>
          {message.from === "user" ? (
            message.text
          ) : (
            <GeminiStoryText text={message.text} />
          )}
        </GeminiMessage>
      ))}
    </Card>
  );
}
