import type { CreateToolContentType } from "@/types/components/chat-page";

export type ChatPostState = "writing" | "unsaved" | "saved";

/** A post the agent created in this chat, in order of first appearance. */
export interface ChatPostEntry {
  toolCallId: string;
  postId: string | null;
  title: string;
  markdown: string;
  contentType: CreateToolContentType;
  state: ChatPostState;
}

export interface ChatPostMention {
  postId: string;
  title: string;
  contentType: CreateToolContentType;
}
