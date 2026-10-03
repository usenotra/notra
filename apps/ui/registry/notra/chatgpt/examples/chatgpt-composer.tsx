"use client";

import { Card } from "@/components/ui/card";

import { ChatgptComposer } from "../components/chatgpt-composer";

export default function ChatgptComposerExample() {
  return (
    <Card className="border-chatgpt-border bg-chatgpt-bg font-chatgpt text-chatgpt-fg flex w-full min-w-0 flex-col gap-4 rounded-2xl border px-4 pt-32 pb-6 text-base ring-0">
      <ChatgptComposer />
      <ChatgptComposer busy />
    </Card>
  );
}
