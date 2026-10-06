export const DEFAULT_AGENT_TRACE_ENDPOINT =
  "https://api.respan.ai/api/v2/traces";

export const AGENT_TRACE_RESOURCE_ATTRIBUTES = { "service.name": "notra" };

export const AGENT_TRACE_ATTRIBUTE_KEYS = new Set([
  "gen_ai.operation.name",
  "gen_ai.provider.name",
  "gen_ai.request.model",
  "gen_ai.response.model",
  "gen_ai.response.id",
  "gen_ai.response.finish_reasons",
  "gen_ai.agent.name",
  "gen_ai.conversation.id",
  "gen_ai.tool.name",
  "gen_ai.tool.call.id",
  "gen_ai.tool.type",
  "gen_ai.usage.input_tokens",
  "gen_ai.usage.output_tokens",
  "gen_ai.usage.cache_read.input_tokens",
  "gen_ai.usage.cache_creation.input_tokens",
  "gen_ai.usage.reasoning.output_tokens",
  "gen_ai.client.operation.duration",
  "gen_ai.client.operation.time_to_first_chunk",
  "gen_ai.client.operation.time_per_output_chunk",
]);

export const AGENT_TRACE_CONTENT_KEYS = new Set([
  "gen_ai.system_instructions",
  "gen_ai.input.messages",
  "gen_ai.output.messages",
  "gen_ai.tool.call.arguments",
  "gen_ai.tool.call.result",
]);

export const AGENT_TRACE_CONTEXT_KEYS = [
  "organizationId",
  "userId",
  "chatId",
  "runId",
  "feature",
  "routeName",
] as const;
