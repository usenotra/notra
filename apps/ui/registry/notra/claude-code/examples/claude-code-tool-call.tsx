import { ClaudeCodeTerminal } from "../components/claude-code-terminal";
import { ClaudeCodeToolCall } from "../components/claude-code-tool-call";
import { CLAUDE_CODE_TOOL_STATES } from "../constants/claude-code-session";

export default function ClaudeCodeToolCallExample() {
  return (
    <ClaudeCodeTerminal title="claude — tools">
      <div className="flex flex-col gap-3">
        {CLAUDE_CODE_TOOL_STATES.map((call) => (
          <ClaudeCodeToolCall
            arg={call.arg}
            defaultOpen={Boolean(call.detail)}
            key={call.id}
            result={call.result}
            status={call.status}
            tool={call.tool}
          >
            {call.detail}
          </ClaudeCodeToolCall>
        ))}
      </div>
    </ClaudeCodeTerminal>
  );
}
