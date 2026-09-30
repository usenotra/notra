import { ChatgptComposer } from "../components/chatgpt-composer";
import { ChatgptMessage } from "../components/chatgpt-message";
import { ChatgptThread } from "../components/chatgpt-thread";
import { CHATGPT_SMALL_TALK } from "../constants/chatgpt-story";

export default function ChatgptThreadExample() {
  return (
    <ChatgptThread
      className="border-chatgpt-border h-96 w-full min-w-0 overflow-hidden rounded-2xl border"
      footer={<ChatgptComposer />}
    >
      {CHATGPT_SMALL_TALK.map((message) => (
        <ChatgptMessage from={message.from} key={message.id}>
          {message.text}
        </ChatgptMessage>
      ))}
    </ChatgptThread>
  );
}
