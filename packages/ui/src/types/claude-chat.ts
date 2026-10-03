export type ClaudeChatModelId =
  | "opus-5.5"
  | "opus-5"
  | "fable-5"
  | "sonnet-5"
  | "haiku-4.5"
  | "opus-4.8"
  | "opus-4.7"
  | "opus-4.6"
  | "opus-3"
  | "sonnet-4.6";

export type ClaudeChatEffortId =
  | "niedrig"
  | "mittel"
  | "hoch"
  | "extra"
  | "max";

export interface ClaudeChatModelOption {
  id: ClaudeChatModelId;
  label: string;
  description: string;
  group: "latest" | "previous";
}

export interface ClaudeChatEffortOption {
  id: ClaudeChatEffortId;
  label: string;
  badge?: string;
  info?: string;
}
