export const CHAT_ANNOTATIONS_MAX = 10;

export const CHAT_ANNOTATIONS_BLOCK_REGEX =
  /^<annotations>\n([\s\S]*?)\n<\/annotations>(?:\n\n)?/;

export const CHAT_ANNOTATION_ITEM_REGEX =
  /<annotation n="\d+" post="@post\/([A-Za-z0-9_-]+)" title="([^"]*)">([\s\S]*?)<\/annotation>/g;

export const CHAT_ANNOTATION_HIGHLIGHT_NAME = "chat-annotation";

export const CHAT_ANNOTATION_DRAFT_HIGHLIGHT_NAME = "chat-annotation-draft";

export const CHAT_ANNOTATION_PASSAGE_REGEX = /<passage>([\s\S]*?)<\/passage>/;

export const CHAT_ANNOTATION_NOTE_REGEX = /<note>([\s\S]*?)<\/note>/;

export const CHAT_ANNOTATION_FLASH_MS = 1600;
