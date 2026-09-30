import type { LanguageModelV4 } from "@ai-sdk/provider";
import type { RoutedModelOptions } from "@notra/ai/types/router";

export type GatewayModelOptions = RoutedModelOptions;

export type GatewayArgs = [modelId: string, options?: GatewayModelOptions];
export type GatewayResult = LanguageModelV4;
