import { expect, test } from "bun:test";

import { applyContentChatToolOutputEffect } from "./apply-content-chat-tool-output";

// agent edits must not enter the inline review mode that suppresses autosave
test("agent edits show the final text without blocking autosave for review", () => {
  const reviewStates: (string | null)[] = [];
  const editedMarkdownRef = { current: null as string | null };
  let editorKey = 0;

  applyContentChatToolOutputEffect(
    {
      type: "apply-markdown-edit",
      fixedMarkdown: "Updated content",
      reviewPrevious: "Original content",
      toolCallId: "edit-1",
    },
    {
      contentId: "content-1",
      contentType: "blog_post",
      editedMarkdownRef,
      editorRef: { current: null },
      geoWriterUpdate: { mutate: () => undefined },
      invalidateContentQueries: async () => undefined,
      originalMarkdownRef: { current: "Original content" },
      setEditedMarkdown: (markdown) => {
        editedMarkdownRef.current = markdown;
      },
      setEditorKey: (update) => {
        editorKey = update(editorKey);
      },
      setOriginalMarkdown: () => undefined,
      setReviewPreviousMarkdown: (markdown) => {
        reviewStates.push(markdown);
      },
      setWriteFocusNonce: () => undefined,
    }
  );

  expect(editedMarkdownRef.current).toBe("Updated content");
  expect(editorKey).toBe(1);
  expect(reviewStates).toEqual([null]);
});
