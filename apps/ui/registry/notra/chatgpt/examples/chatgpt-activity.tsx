import { Card } from "@/components/ui/card";

import { ChatgptActivity } from "../components/chatgpt-activity";
import { CHATGPT_STORY_SEARCH } from "../constants/chatgpt-story";

export default function ChatgptActivityExample() {
  return (
    <Card className="border-chatgpt-border bg-chatgpt-bg font-chatgpt text-chatgpt-fg w-full min-w-0 items-start gap-0 rounded-2xl border p-6 text-base ring-0">
      <ChatgptActivity
        seconds={21}
        sites={CHATGPT_STORY_SEARCH.sites}
        sourceCount={CHATGPT_STORY_SEARCH.sourceCount}
        sources={CHATGPT_STORY_SEARCH.sources}
        websites={CHATGPT_STORY_SEARCH.websites}
      />
    </Card>
  );
}
