import {
  AGENT_TRACE_ATTRIBUTE_KEYS,
  AGENT_TRACE_CONTENT_KEYS,
  AGENT_TRACE_CONTEXT_KEYS,
} from "@notra/ai/constants/agent-tracing";
import { type Attributes, SpanKind } from "@opentelemetry/api";

export function buildAgentTraceAttributes(
  source: Attributes,
  recordContent: boolean,
  spanKind?: SpanKind
): Attributes {
  const attributes: Attributes = Object.fromEntries(
    Object.entries(source).filter(
      ([key]) =>
        AGENT_TRACE_ATTRIBUTE_KEYS.has(key) ||
        (recordContent && AGENT_TRACE_CONTENT_KEYS.has(key))
    )
  );
  const metadata: Record<string, string | number | boolean> = {};
  for (const key of AGENT_TRACE_CONTEXT_KEYS) {
    const value = source[`ai.settings.context.${key}`];
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      metadata[key] = value;
      attributes[`notra.${key}`] = value;
    }
  }

  attributes["gen_ai.system"] = attributes["gen_ai.provider.name"];
  attributes["gen_ai.usage.prompt_tokens"] =
    attributes["gen_ai.usage.input_tokens"];
  attributes["gen_ai.usage.completion_tokens"] =
    attributes["gen_ai.usage.output_tokens"];
  attributes["gen_ai.usage.cache_read_input_tokens"] =
    attributes["gen_ai.usage.cache_read.input_tokens"];
  const reasoningTokens = source["ai.usage.outputTokenDetails.reasoningTokens"];
  if (typeof reasoningTokens === "number") {
    attributes["gen_ai.usage.reasoning.output_tokens"] = reasoningTokens;
    attributes["llm.usage.reasoning_tokens"] = reasoningTokens;
  }
  const operation = attributes["gen_ai.operation.name"];
  if (operation === "execute_tool") {
    attributes["traceloop.span.kind"] = "tool";
  } else if (operation === "agent_step") {
    attributes["traceloop.span.kind"] = "task";
  } else if (spanKind === SpanKind.INTERNAL) {
    attributes["traceloop.span.kind"] = "agent";
  }
  if (recordContent) {
    attributes["traceloop.entity.input"] =
      attributes["gen_ai.tool.call.arguments"] ??
      attributes["gen_ai.input.messages"];
    attributes["traceloop.entity.output"] =
      attributes["gen_ai.tool.call.result"] ??
      attributes["gen_ai.output.messages"];
  }
  attributes["gen_ai.conversation.id"] ??= metadata.chatId;
  attributes["gen_ai.agent.name"] ??= metadata.feature;
  attributes["traceloop.workflow.name"] = metadata.feature;
  attributes["respan.customer_params.customer_identifier"] =
    metadata.userId ?? metadata.organizationId;
  attributes["respan.threads.thread_identifier"] = metadata.chatId;
  attributes["respan.trace.trace_group_identifier"] =
    metadata.runId ?? metadata.chatId;
  if (Object.keys(metadata).length > 0) {
    attributes["respan.metadata"] = JSON.stringify(metadata);
  }
  return Object.fromEntries(
    Object.entries(attributes).filter(([, value]) => value !== undefined)
  );
}
