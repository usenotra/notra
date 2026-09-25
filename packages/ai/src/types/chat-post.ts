import type { ContentType } from "../schemas/content";

export interface SavedChatPost {
  postId: string;
  toolCallId: string | null;
  title: string;
  markdown: string | null;
  contentType: ContentType;
  status: string;
}
