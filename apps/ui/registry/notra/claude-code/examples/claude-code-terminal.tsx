import { ClaudeCodeMessage } from "../components/claude-code-message";
import { ClaudeCodeTerminal } from "../components/claude-code-terminal";
import { CLAUDE_CODE_SESSION } from "../constants/claude-code-session";

const [turn] = CLAUDE_CODE_SESSION.turns;

export default function ClaudeCodeTerminalExample() {
  return (
    <ClaudeCodeTerminal title={CLAUDE_CODE_SESSION.title}>
      <ClaudeCodeMessage from="user">{turn.prompt}</ClaudeCodeMessage>
      <ClaudeCodeMessage>{turn.answer}</ClaudeCodeMessage>
    </ClaudeCodeTerminal>
  );
}
