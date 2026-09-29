import { Card } from "@/components/ui/card";

import { GeminiStoryText } from "../components/gemini-story-text";
import { GEMINI_STORY_SOURCES } from "../constants/gemini-story";

export default function GeminiSourceChipExample() {
  return (
    <Card className="border-gemini-border bg-gemini-bg font-gemini text-gemini-fg flex w-full min-w-0 flex-col gap-4 overflow-hidden rounded-2xl border px-5 py-8 text-[0.9375rem] leading-[1.65] ring-0">
      <GeminiStoryText
        sources={GEMINI_STORY_SOURCES}
        text="**Cursor Origin** is Cursor's cloud workspace, and the agent keeps working there. {{cursor-blog}} **wal-on-s3** ships its write-ahead log segments to S3, so state stays versioned and durable. {{s3-docs}}"
      />
    </Card>
  );
}
