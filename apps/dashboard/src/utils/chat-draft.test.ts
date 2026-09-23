import { describe, expect, test } from "bun:test";

import {
  carryChatDraft,
  getChatDraftStorageKey,
  newChatDraftId,
} from "./chat-draft";

function memoryStorage(initial: Record<string, string> = {}) {
  const data = { ...initial };
  return {
    getItem(key: string) {
      return data[key] ?? null;
    },
    setItem(key: string, value: string) {
      data[key] = value;
    },
    removeItem(key: string) {
      delete data[key];
    },
  };
}

describe("newChatDraftId", () => {
  test("scopes the unsaved composer to the organization", () => {
    expect(newChatDraftId("acme")).toBe("new:acme");
    expect(getChatDraftStorageKey(undefined, "acme")).toBe(
      "chat-draft:new:acme"
    );
    expect(getChatDraftStorageKey("chat-1", "acme")).toBe("chat-draft:chat-1");
  });
});

describe("carryChatDraft", () => {
  test("prefers the live composer over a stale stored draft", () => {
    const storage = memoryStorage({
      "chat-draft:old": "stale",
    });

    expect(
      carryChatDraft({
        fromKey: "chat-draft:old",
        toKey: "chat-draft:new:acme",
        liveKey: "chat-draft:old",
        liveValue: "keep this prompt",
        storage,
      })
    ).toBe(true);
    expect(storage.getItem("chat-draft:new:acme")).toBe("keep this prompt");
    expect(storage.getItem("chat-draft:old")).toBeNull();
  });

  test("falls back to storage when the live draft belongs to another chat", () => {
    const storage = memoryStorage({
      "chat-draft:old": "stored prompt",
    });

    expect(
      carryChatDraft({
        fromKey: "chat-draft:old",
        toKey: "chat-draft:new:acme",
        liveKey: "chat-draft:other",
        liveValue: "unrelated",
        storage,
      })
    ).toBe(true);
    expect(storage.getItem("chat-draft:new:acme")).toBe("stored prompt");
    expect(storage.getItem("chat-draft:old")).toBeNull();
  });

  test("does not overwrite a new-chat draft with an empty composer", () => {
    const storage = memoryStorage({
      "chat-draft:new:acme": "already typed",
    });

    expect(
      carryChatDraft({
        fromKey: "chat-draft:old",
        toKey: "chat-draft:new:acme",
        liveKey: "chat-draft:old",
        liveValue: "   ",
        storage,
      })
    ).toBe(false);
    expect(storage.getItem("chat-draft:new:acme")).toBe("already typed");
  });

  test("is a no-op when already on a new chat", () => {
    const storage = memoryStorage({
      "chat-draft:new:acme": "draft",
    });

    expect(
      carryChatDraft({
        fromKey: "chat-draft:new:acme",
        toKey: "chat-draft:new:acme",
        liveKey: "chat-draft:new:acme",
        liveValue: "draft",
        storage,
      })
    ).toBe(false);
    expect(storage.getItem("chat-draft:new:acme")).toBe("draft");
  });
});
