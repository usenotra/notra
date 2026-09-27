import type { CONTENT_MEDIA } from "@/constants/content-media";

export type ContentMediaKind = keyof typeof CONTENT_MEDIA;

// Retain an asynchronous drop's Lexical caret independently of focus changes while its files upload.
export type ContentDropPoint = {
  key: string;
  offset: number;
  type: "element" | "text";
};
