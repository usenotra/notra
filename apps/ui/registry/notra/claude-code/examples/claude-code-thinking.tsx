import { ClaudeCodeTerminal } from "../components/claude-code-terminal";
import { ClaudeCodeThinking } from "../components/claude-code-thinking";

const THOUGHT =
  "The user wants the changes since v1.8.0. I'll read the git log first, then group the merged PRs by app so the answer maps to the monorepo layout.";

export default function ClaudeCodeThinkingExample() {
  return (
    <ClaudeCodeTerminal title="claude — thinking">
      <ClaudeCodeThinking>{THOUGHT}</ClaudeCodeThinking>
      <ClaudeCodeThinking defaultOpen label="Thought for 3s">
        {THOUGHT}
      </ClaudeCodeThinking>
    </ClaudeCodeTerminal>
  );
}
