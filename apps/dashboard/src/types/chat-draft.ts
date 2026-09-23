export interface ChatDraftStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface CarryChatDraftInput {
  fromKey: string;
  liveKey: string;
  liveValue: string;
  storage: ChatDraftStorage;
  toKey: string;
}
