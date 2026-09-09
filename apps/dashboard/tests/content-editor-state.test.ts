import { describe, expect, test } from "bun:test";

import {
  INITIAL_CONTENT_CHAT_UI_STATE,
  INITIAL_CONTENT_DOCUMENT_STATE,
} from "@/constants/content-editor-state";
import {
  contentChatUiReducer,
  contentDocumentReducer,
} from "@/utils/content-editor-state";

describe("content document transitions", () => {
  test("discard restores persisted markdown and clears pending metadata", () => {
    const loaded = contentDocumentReducer(INITIAL_CONTENT_DOCUMENT_STATE, {
      type: "contentLoaded",
      markdown: "saved",
    });
    const edited = {
      ...loaded,
      editedMarkdown: "draft",
      editingTitle: "New title",
      editingSlug: "new-slug",
      reviewPreviousMarkdown: "saved",
    };

    expect(contentDocumentReducer(edited, { type: "discarded" })).toMatchObject(
      {
        editedMarkdown: "saved",
        editingTitle: null,
        editingSlug: null,
        reviewPreviousMarkdown: null,
        editorVersion: 2,
      }
    );
  });

  test("save promotes the draft and preserves the server response", () => {
    const state = {
      ...INITIAL_CONTENT_DOCUMENT_STATE,
      editedMarkdown: "draft",
      originalMarkdown: "saved",
      editingTitle: "Draft title",
    };
    expect(
      contentDocumentReducer(state, {
        type: "saveCompleted",
        markdown: "draft",
        title: "Server title",
        slug: "server-slug",
        submittedTitle: "Draft title",
        submittedSlug: null,
      })
    ).toMatchObject({
      originalMarkdown: "draft",
      persistedTitle: "Server title",
      persistedSlug: "server-slug",
      editingTitle: null,
    });
  });

  test("save promotes the submitted draft, not edits made in flight", () => {
    const state = {
      ...INITIAL_CONTENT_DOCUMENT_STATE,
      editedMarkdown: "newer draft",
      originalMarkdown: "saved",
    };
    expect(
      contentDocumentReducer(state, {
        type: "saveCompleted",
        markdown: "submitted draft",
        title: "Title",
        slug: null,
        submittedTitle: null,
        submittedSlug: null,
      })
    ).toMatchObject({
      editedMarkdown: "newer draft",
      originalMarkdown: "submitted draft",
    });
  });

  test("save preserves metadata edited in flight, including an emptied slug", () => {
    const state = {
      ...INITIAL_CONTENT_DOCUMENT_STATE,
      editingTitle: "Newer title",
      editingSlug: "",
    };
    expect(
      contentDocumentReducer(state, {
        type: "saveCompleted",
        markdown: null,
        title: "Saved title",
        slug: "saved-slug",
        submittedTitle: "Submitted title",
        submittedSlug: "submitted-slug",
      })
    ).toMatchObject({
      editingTitle: "Newer title",
      editingSlug: "",
      persistedTitle: "Saved title",
      persistedSlug: "saved-slug",
    });
  });

  test("changing the baseline does not overwrite the current draft", () => {
    const state = {
      ...INITIAL_CONTENT_DOCUMENT_STATE,
      editedMarkdown: "newer draft",
      originalMarkdown: "saved",
      reviewPreviousMarkdown: "before agent edit",
    };
    expect(
      contentDocumentReducer(state, {
        type: "markdownBaselineChanged",
        markdown: "persisted plan",
      })
    ).toMatchObject({
      editedMarkdown: "newer draft",
      originalMarkdown: "persisted plan",
      reviewPreviousMarkdown: "before agent edit",
    });
  });
});

describe("content chat transitions", () => {
  test("editing a queued message restores its context instead of appending it", () => {
    const existing = {
      type: "github-repo" as const,
      integrationId: "github-1",
      owner: "notra",
      repo: "existing",
    };
    const queued = { ...existing, repo: "queued" };
    const message = {
      id: "edit",
      text: "queued instruction",
      context: [queued],
    };
    const state = {
      ...INITIAL_CONTENT_CHAT_UI_STATE,
      context: [existing],
      queuedMessages: [message, { id: "keep", text: "later" }],
    };
    expect(
      contentChatUiReducer(state, { type: "queuedMessageEdited", message })
    ).toMatchObject({
      input: "queued instruction",
      context: [queued],
      queuedMessages: [{ id: "keep", text: "later" }],
    });
    expect(
      contentChatUiReducer(state, {
        type: "queuedMessageEdited",
        message: { ...message, context: [] },
      }).context
    ).toEqual([existing]);
  });

  test("selecting a session clears its queue and hydrates that session", () => {
    const state = {
      ...INITIAL_CONTENT_CHAT_UI_STATE,
      queuedMessages: [{ id: "queued", text: "later" }],
    };
    expect(
      contentChatUiReducer(state, { type: "chatSelected", chatId: "chat-2" })
    ).toMatchObject({
      queuedMessages: [],
      activeChatId: "chat-2",
      chatIdToHydrate: "chat-2",
    });
  });

  test("does not add duplicate repository context", () => {
    const item = {
      type: "github-repo" as const,
      integrationId: "github-1",
      owner: "notra",
      repo: "app",
    };
    const once = contentChatUiReducer(INITIAL_CONTENT_CHAT_UI_STATE, {
      type: "contextAdded",
      item,
    });
    expect(
      contentChatUiReducer(once, { type: "contextAdded", item }).context
    ).toEqual([item]);
  });
});
