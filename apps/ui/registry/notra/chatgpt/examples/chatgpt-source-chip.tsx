import { Card } from "@/components/ui/card";

import { ChatgptSourceChip } from "../components/chatgpt-source-chip";
import { CHATGPT_STORY_SOURCES } from "../constants/chatgpt-story";

export default function ChatgptSourceChipExample() {
  return (
    <Card className="border-chatgpt-border bg-chatgpt-bg font-chatgpt text-chatgpt-fg flex w-full min-w-0 flex-col gap-3 rounded-2xl border p-6 text-base leading-7 ring-0">
      <p>
        G7 foreign ministers are weighing new sanctions in Ottawa.
        <ChatgptSourceChip sources={CHATGPT_STORY_SOURCES.slice(0, 2)} />
      </p>
      <p>
        Markets opened higher after strong US tech earnings.
        <ChatgptSourceChip sources={CHATGPT_STORY_SOURCES.slice(3, 4)} />
      </p>
    </Card>
  );
}
