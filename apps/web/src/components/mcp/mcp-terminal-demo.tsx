import { ClaudeCodeHeader } from "@notra/ui/components/ai-skins/claude-code/claude-code-header";
import { ClaudeCodeMessage } from "@notra/ui/components/ai-skins/claude-code/claude-code-message";
import { ClaudeCodePrompt } from "@notra/ui/components/ai-skins/claude-code/claude-code-prompt";
import { ClaudeCodeTurnSummary } from "@notra/ui/components/ai-skins/claude-code/claude-code-status";
import { ClaudeCodeTerminal } from "@notra/ui/components/ai-skins/claude-code/claude-code-terminal";
import { ClaudeCodeTodoList } from "@notra/ui/components/ai-skins/claude-code/claude-code-todo-list";
import { ClaudeCodeToolCall } from "@notra/ui/components/ai-skins/claude-code/claude-code-tool-call";

import {
  MCP_TERMINAL_ASSISTANT_MESSAGE,
  MCP_TERMINAL_HEADER,
  MCP_TERMINAL_PROMPT_PLACEHOLDER,
  MCP_TERMINAL_RESULT_MESSAGE,
  MCP_TERMINAL_TITLE,
  MCP_TERMINAL_TODOS,
  MCP_TERMINAL_TOOL_CALLS,
  MCP_TERMINAL_TURN_SUMMARY,
  MCP_TERMINAL_USER_MESSAGE,
  MCP_TERMINAL_WHATS_NEW_STATIC,
} from "@/constants/mcp";
import type { McpTerminalDemoProps } from "@/types/mcp";
import { formatMcpWhatsNewDiscovery } from "@/utils/mcp";

export function McpTerminalDemo({ toolCount }: McpTerminalDemoProps) {
  return (
    <ClaudeCodeTerminal title={MCP_TERMINAL_TITLE}>
      <ClaudeCodeHeader
        cwd={MCP_TERMINAL_HEADER.cwd}
        model={MCP_TERMINAL_HEADER.model}
        org={MCP_TERMINAL_HEADER.org}
        tips={[formatMcpWhatsNewDiscovery(toolCount)]}
        version={MCP_TERMINAL_HEADER.version}
        whatsNew={[MCP_TERMINAL_WHATS_NEW_STATIC]}
      />
      <ClaudeCodeMessage from="user">
        {MCP_TERMINAL_USER_MESSAGE}
      </ClaudeCodeMessage>
      <ClaudeCodeMessage>{MCP_TERMINAL_ASSISTANT_MESSAGE}</ClaudeCodeMessage>
      <ClaudeCodeTodoList todos={MCP_TERMINAL_TODOS} />
      {MCP_TERMINAL_TOOL_CALLS.map((call) => (
        <ClaudeCodeToolCall
          arg={call.arg}
          key={call.tool}
          result={call.result}
          tool={call.tool}
        />
      ))}
      <ClaudeCodeMessage>{MCP_TERMINAL_RESULT_MESSAGE}</ClaudeCodeMessage>
      <ClaudeCodeTurnSummary {...MCP_TERMINAL_TURN_SUMMARY} />
      <ClaudeCodePrompt
        className="mt-1"
        mode="bypass"
        placeholder={MCP_TERMINAL_PROMPT_PLACEHOLDER}
      />
    </ClaudeCodeTerminal>
  );
}
