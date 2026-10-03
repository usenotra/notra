export const AGENT_SERVICE_USERNAME = "notra-dashboard";
export const AGENT_ORGANIZATION_HEADER = "x-notra-organization-id";
export const AGENT_USER_HEADER = "x-notra-user-id";
export const AGENT_CHAT_HEADER = "x-notra-chat-id";
export const AGENT_SURFACE_HEADER = "x-notra-surface";
export const AGENT_CONTENT_HEADER = "x-notra-content-id";
export const AGENT_COLLECTION_HEADER = "x-notra-collection-id";
export const AGENT_CONTENT_TYPE_HEADER = "x-notra-content-type";
export const AGENT_AUTO_PUBLISH_HEADER = "x-notra-auto-publish";
export const AGENT_USE_MARKUP_HEADER = "x-notra-use-markup";
export const AGENT_CHARGE_AI_CREDITS_HEADER = "x-notra-charge-ai-credits";
export const AGENT_VOICE_HEADER = "x-notra-voice-id";
export const AGENT_BRAND_AGENT_TYPE_HEADER = "x-notra-brand-agent-type";
export const AGENT_SOURCE_METADATA_HEADER = "x-notra-source-metadata";
export const AGENT_GENERATION_CONFIG_HEADER = "x-notra-generation-config";
export const AGENT_CODE_RESEARCH_HEADER = "x-notra-code-research";

export const AGENT_SURFACES = [
  "standalone-chat",
  "content-editor",
  "task",
] as const;

export const AGENT_SESSION_ROUTE_PATH = "/eve/v1/session";
export const AGENT_SESSION_TASK_MODE = "task";
