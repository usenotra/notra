import { ClaudeCodeHeader } from "@notra/ui/components/ai-skins/claude-code/claude-code-header";
import { ClaudeCodeMessage } from "@notra/ui/components/ai-skins/claude-code/claude-code-message";
import { ClaudeCodePrompt } from "@notra/ui/components/ai-skins/claude-code/claude-code-prompt";
import { ClaudeCodeTurnSummary } from "@notra/ui/components/ai-skins/claude-code/claude-code-status";
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
    <div className="flex w-full flex-col overflow-clip rounded-[1.25rem] bg-[#0f0f0f] [box-shadow:#28282833_0rem_1.5rem_3.5rem_-1rem]">
      <div className="relative flex items-center justify-center bg-[#1c1c1c] px-4.5 py-3">
        <div className="absolute left-4.5 flex items-center gap-1.5">
          <div className="size-2.5 shrink-0 rounded-full bg-[#3a3a3a]" />
          <div className="size-2.5 shrink-0 rounded-full bg-[#3a3a3a]" />
          <div className="size-2.5 shrink-0 rounded-full bg-[#3a3a3a]" />
        </div>
        <span className="font-mono text-[0.75rem] leading-4 text-[#FFFFFF66]">
          {MCP_TERMINAL_TITLE}
        </span>
      </div>
      <div className="flex flex-col gap-5 px-3 py-4 sm:px-5 sm:py-5">
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
      </div>
    </div>
  );
}
