import { localStorageKeys } from "@/constants/storage";
import type { CarryChatDraftInput } from "@/types/chat-draft";

let liveDraftKey = "";
let liveDraftValue = "";

export function newChatDraftId(organizationSlug: string) {
  return `new:${organizationSlug}`;
}

export function getChatDraftStorageKey(
  chatId: string | undefined,
  organizationSlug: string
) {
  return localStorageKeys.chatDraft(chatId ?? newChatDraftId(organizationSlug));
}

export function rememberLiveChatDraft(key: string, value: string) {
  liveDraftKey = key;
  liveDraftValue = value;
}

export function carryChatDraft({
  fromKey,
  toKey,
  liveKey,
  liveValue,
  storage,
}: CarryChatDraftInput): boolean {
  if (fromKey === toKey) {
    return false;
  }

  const storedValue =
    liveKey === fromKey ? liveValue : storage.getItem(fromKey);
  const value = storedValue ?? "";
  if (!value.trim()) {
    return false;
  }

  storage.setItem(toKey, value);
  storage.removeItem(fromKey);
  return true;
}

export function carryLiveChatDraftToNewChat(
  chatId: string,
  organizationSlug: string
) {
  try {
    carryChatDraft({
      fromKey: localStorageKeys.chatDraft(chatId),
      toKey: getChatDraftStorageKey(undefined, organizationSlug),
      liveKey: liveDraftKey,
      liveValue: liveDraftValue,
      storage: window.localStorage,
    });
  } catch {
    // noop
  }
}
