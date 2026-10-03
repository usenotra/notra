import { Card } from "@/components/ui/card";

import { ChatgptActivity } from "../components/chatgpt-activity";
import { ChatgptReasoning } from "../components/chatgpt-reasoning";
import { CHATGPT_STORY_SEARCH } from "../constants/chatgpt-story";

export default function ChatgptReasoningExample() {
  return (
    <Card className="border-chatgpt-border bg-chatgpt-bg font-chatgpt text-chatgpt-fg flex w-full min-w-0 flex-col gap-6 rounded-2xl border p-6 text-base ring-0">
      <ChatgptReasoning
        search={
          <ChatgptActivity
            seconds={21}
            sites={CHATGPT_STORY_SEARCH.sites}
            sourceCount={CHATGPT_STORY_SEARCH.sourceCount}
            sources={CHATGPT_STORY_SEARCH.sources}
            websites={CHATGPT_STORY_SEARCH.websites}
          />
        }
        seconds={21}
      >
        <p className="text-chatgpt-fg">
          Sure. I'll pull together the biggest news from today, focused on world
          politics, business and tech.
        </p>
      </ChatgptReasoning>
      <ChatgptReasoning seconds={4} />
    </Card>
  );
}
