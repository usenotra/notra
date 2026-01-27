export const FEATURES = {
  CHAT_MESSAGES: "chat_messages",
} as const;

export type FeatureId = (typeof FEATURES)[keyof typeof FEATURES];
