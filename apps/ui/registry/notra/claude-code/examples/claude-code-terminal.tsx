import { ClaudeCodeMessage } from "../components/claude-code-message";
import { ClaudeCodeTerminal } from "../components/claude-code-terminal";

export default function ClaudeCodeTerminalExample() {
  return (
    <ClaudeCodeTerminal title="claude — ~/acme/web">
      <ClaudeCodeMessage>
        Anything inside renders in the terminal body.
      </ClaudeCodeMessage>
    </ClaudeCodeTerminal>
  );
}
