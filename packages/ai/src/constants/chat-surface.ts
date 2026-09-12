export const CHAT_SURFACE = {
  studio: "studio",
  agent: "agent",
  slack: "slack",
  discord: "discord",
} as const;

export const STANDALONE_INBOX_SURFACES = [
  CHAT_SURFACE.studio,
  CHAT_SURFACE.agent,
  CHAT_SURFACE.slack,
  CHAT_SURFACE.discord,
] as const;
