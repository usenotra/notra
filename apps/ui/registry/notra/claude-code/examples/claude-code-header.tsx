import { ClaudeCodeHeader } from "../components/claude-code-header";
import { ClaudeCodeTerminal } from "../components/claude-code-terminal";
import { CLAUDE_CODE_SESSION } from "../constants/claude-code-session";

export default function ClaudeCodeHeaderExample() {
  return (
    <ClaudeCodeTerminal title="claude — header">
      <ClaudeCodeHeader {...CLAUDE_CODE_SESSION.header} />
    </ClaudeCodeTerminal>
  );
}
