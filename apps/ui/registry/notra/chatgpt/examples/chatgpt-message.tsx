import { Card } from "@/components/ui/card";

import { ChatgptActions } from "../components/chatgpt-actions";
import { ChatgptMessage } from "../components/chatgpt-message";

export default function ChatgptMessageExample() {
  return (
    <Card className="border-chatgpt-border bg-chatgpt-bg font-chatgpt text-chatgpt-fg flex w-full min-w-0 flex-col gap-6 rounded-2xl border p-6 text-base ring-0">
      <ChatgptMessage from="user">
        What are the biggest news stories today?
      </ChatgptMessage>
      <ChatgptMessage
        actions={
          <ChatgptActions text="G7 foreign ministers are meeting in Ottawa on a new sanctions package." />
        }
        from="assistant"
      >
        G7 foreign ministers are meeting in Ottawa on a new sanctions package,
        while the ceasefire talks in Geneva have stalled again.
      </ChatgptMessage>
    </Card>
  );
}
