import { Card } from "@/components/ui/card";

import { ChatgptSearch } from "../components/chatgpt-search";
import { CHATGPT_STORY_SITES } from "../constants/chatgpt-story";

export default function ChatgptSearchExample() {
  return (
    <Card className="border-chatgpt-border bg-chatgpt-bg font-chatgpt text-chatgpt-fg flex w-full min-w-0 flex-col items-start gap-3 rounded-2xl border p-6 text-base ring-0">
      <ChatgptSearch websites={1} />
      <ChatgptSearch sites={CHATGPT_STORY_SITES.slice(0, 3)} websites={3} />
      <ChatgptSearch sites={CHATGPT_STORY_SITES} websites={6} />
    </Card>
  );
}
