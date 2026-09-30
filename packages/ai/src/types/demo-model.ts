import type { LanguageModelV4FunctionTool } from "@ai-sdk/provider";

export type DemoJsonSchema = LanguageModelV4FunctionTool["inputSchema"];
export type DemoJsonSchemaDefinition = DemoJsonSchema | boolean;

export interface DemoFakeContext {
  /** Root schema, for resolving `$ref`s. */
  root: DemoJsonSchema;
  /** Text of the latest user message; seeds deterministic choices. */
  seed: string;
  german: boolean;
  depth: number;
}

export type DemoToolArgs = Record<string, unknown>;

export interface DemoChatScenario {
  id: string;
  /** Matched against the latest user message. */
  pattern: RegExp;
  /** First tool whose name matches is called before answering. */
  toolPattern?: RegExp;
  /** Merged over schema-generated tool arguments. */
  toolArgs?: (german: boolean) => DemoToolArgs;
  reply: { en: string; de: string };
  /** Answer after the tool result came back. */
  followUp?: { en: string; de: string };
}
