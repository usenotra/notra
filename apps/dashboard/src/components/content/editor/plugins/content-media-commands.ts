import { createCommand, type LexicalCommand } from "lexical";

export const OPEN_CONTENT_IMAGE_UPLOAD_COMMAND: LexicalCommand<void> =
  createCommand("OPEN_CONTENT_IMAGE_UPLOAD_COMMAND");

export const OPEN_CONTENT_VIDEO_UPLOAD_COMMAND: LexicalCommand<void> =
  createCommand("OPEN_CONTENT_VIDEO_UPLOAD_COMMAND");
