import { ClaudeCodeMessage } from "../components/claude-code-message";
import { ClaudeCodeTerminal } from "../components/claude-code-terminal";
import { CLAUDE_CODE_SESSION } from "../constants/claude-code-session";

export default function ClaudeCodeMessageExample() {
  return (
    <ClaudeCodeTerminal title="claude — messages">
      <ClaudeCodeMessage className="rounded-sm px-2.5 py-1.5" from="user">
        {CLAUDE_CODE_SESSION.userMessage}
      </ClaudeCodeMessage>
      <ClaudeCodeMessage>
        {CLAUDE_CODE_SESSION.assistantMessage}
      </ClaudeCodeMessage>
      <ClaudeCodeMessage>{CLAUDE_CODE_SESSION.resultMessage}</ClaudeCodeMessage>
    </ClaudeCodeTerminal>
  );
}
