import { Card } from "@/components/ui/card";

import { ChatgptThinking } from "../components/chatgpt-thinking";

export default function ChatgptThinkingExample() {
  return (
    <Card className="border-chatgpt-border bg-chatgpt-bg font-chatgpt text-chatgpt-fg w-full min-w-0 items-start gap-0 rounded-2xl border p-6 text-base ring-0">
      <ChatgptThinking />
    </Card>
  );
}
