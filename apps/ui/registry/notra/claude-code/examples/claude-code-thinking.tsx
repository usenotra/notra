import { ClaudeCodeTerminal } from "../components/claude-code-terminal";
import { ClaudeCodeThinking } from "../components/claude-code-thinking";
import { CLAUDE_CODE_SESSION } from "../constants/claude-code-session";

export default function ClaudeCodeThinkingExample() {
  return (
    <ClaudeCodeTerminal title="claude — thinking">
      <div className="flex flex-col gap-3">
        <ClaudeCodeThinking>{CLAUDE_CODE_SESSION.thinking}</ClaudeCodeThinking>
        <ClaudeCodeThinking defaultOpen label="Thinking…">
          {CLAUDE_CODE_SESSION.thinking}
        </ClaudeCodeThinking>
      </div>
    </ClaudeCodeTerminal>
  );
}
