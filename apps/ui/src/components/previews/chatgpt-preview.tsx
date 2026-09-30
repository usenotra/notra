import { ChatgptMessage } from "../../../registry/notra/chatgpt/components/chatgpt-message";

export default function ChatgptPreview() {
  return (
    <div className="border-chatgpt-border bg-chatgpt-bg font-chatgpt text-chatgpt-fg flex w-[26rem] origin-top scale-[0.8] flex-col gap-6 overflow-hidden rounded-2xl border p-6 text-base shadow-sm">
      <ChatgptMessage from="user">
        What are the biggest news stories today?
      </ChatgptMessage>
      <ChatgptMessage from="assistant">
        G7 foreign ministers are meeting in Ottawa on a new sanctions package,
        while the ceasefire talks in Geneva have stalled again.
      </ChatgptMessage>
    </div>
  );
}
