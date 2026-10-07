import {
  ClaudeCodeSpinner,
  ClaudeCodeTurnSummary,
} from "../components/claude-code-status";
import { ClaudeCodeTerminal } from "../components/claude-code-terminal";
import { CLAUDE_CODE_SESSION } from "../constants/claude-code-session";

const [turn] = CLAUDE_CODE_SESSION.turns;

export default function ClaudeCodeStatusExample() {
  return (
    <ClaudeCodeTerminal title="claude — status">
      <ClaudeCodeSpinner {...CLAUDE_CODE_SESSION.pending.spinner} />
      <ClaudeCodeSpinner elapsed="2s" verb="Frosting" />
      <ClaudeCodeTurnSummary {...turn.summary} />
      <ClaudeCodeTurnSummary doneAt="9:42 AM" duration="19s" />
    </ClaudeCodeTerminal>
  );
}
