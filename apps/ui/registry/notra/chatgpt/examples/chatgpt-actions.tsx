"use client";

import { Card } from "@/components/ui/card";

import { ChatgptActions } from "../components/chatgpt-actions";

export default function ChatgptActionsExample() {
  return (
    <Card className="border-chatgpt-border bg-chatgpt-bg font-chatgpt text-chatgpt-fg w-full min-w-0 items-start gap-0 rounded-2xl border p-6 text-base ring-0">
      <ChatgptActions text="Anytime 😭" />
    </Card>
  );
}
