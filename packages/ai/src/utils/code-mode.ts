import { experimental_codeModeTool as codeModeTool } from "@ai-sdk/code-mode";
import {
  CODE_MODE_TIMEOUT_MS,
  CODE_MODE_TOOL_NAME,
  STANDALONE_CODE_MODE_TOOL_NAMES,
} from "@notra/ai/constants/code-mode";
import type { Experimental_ToolCallers, Tool } from "ai";

/**
 * Adds the official code_mode tool and restricts the read-only standalone
 * tools to it, so the model can only reach them from sandboxed code.
 */
export function withStandaloneCodeMode(tools: Record<string, Tool>) {
  const toolsWithCodeMode: Record<string, Tool> = {
    ...tools,
    [CODE_MODE_TOOL_NAME]: codeModeTool({
      executionPolicy: { timeoutMs: CODE_MODE_TIMEOUT_MS },
    }),
  };
  // The tool record is string-keyed, so the SDK cannot infer code_mode as a
  // caller name from its type.
  const toolCallers = Object.fromEntries(
    STANDALONE_CODE_MODE_TOOL_NAMES.filter((toolName) => toolName in tools).map(
      (toolName) => [toolName, [CODE_MODE_TOOL_NAME]]
    )
  ) as unknown as Experimental_ToolCallers<Record<string, Tool>>;

  return { tools: toolsWithCodeMode, toolCallers };
}
