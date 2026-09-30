import { ClaudeCodeMessage } from "../../../registry/notra/claude-code/components/claude-code-message";
import { ClaudeCodeTerminal } from "../../../registry/notra/claude-code/components/claude-code-terminal";
import { CLAUDE_CODE_SESSION } from "../../../registry/notra/claude-code/constants/claude-code-session";

const [turn] = CLAUDE_CODE_SESSION.turns;

export default function ClaudeCodePreview() {
  return (
    <div className="w-[26rem] origin-top scale-[0.8]">
      <ClaudeCodeTerminal title={CLAUDE_CODE_SESSION.title}>
        <ClaudeCodeMessage from="user">{turn.prompt}</ClaudeCodeMessage>
        <ClaudeCodeMessage>{turn.answer}</ClaudeCodeMessage>
      </ClaudeCodeTerminal>
    </div>
  );
}
