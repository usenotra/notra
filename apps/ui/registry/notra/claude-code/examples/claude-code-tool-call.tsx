import { ClaudeCodeTerminal } from "../components/claude-code-terminal";
import {
  ClaudeCodeToolCall,
  ClaudeCodeToolSummary,
} from "../components/claude-code-tool-call";

const CHANGELOG_EXCERPT = `## v1.9.0
- GEO scan view with per-engine citations
- Schedule posts from the API`;

export default function ClaudeCodeToolCallExample() {
  return (
    <ClaudeCodeTerminal title="claude — tools">
      <ClaudeCodeToolCall
        arg="git log --oneline v1.8.0..HEAD"
        result="14 commits"
        tool="Bash"
      />
      <ClaudeCodeToolCall
        arg="CHANGELOG.md"
        result="Read 212 lines"
        tool="Read"
      >
        {CHANGELOG_EXCERPT}
      </ClaudeCodeToolCall>
      <ClaudeCodeToolCall
        result="$ notra posts create --type changelog --from-prs v1.8.0..HEAD"
        status="pending"
        tool="Drafting the changelog in notra"
      />
      <ClaudeCodeToolCall
        arg="publish_post"
        result="Error: post is still in review"
        status="error"
        tool="notra"
      />
      <ClaudeCodeToolSummary count={3} defaultOpen>
        <ClaudeCodeToolCall
          arg="git status --short"
          result="2 files changed"
          tool="Bash"
        />
        <ClaudeCodeToolCall
          arg="bun run check-types"
          result="0 errors"
          tool="Bash"
        />
        <ClaudeCodeToolCall
          arg="gh pr view --json number"
          result='{"number": 1317}'
          tool="Bash"
        />
      </ClaudeCodeToolSummary>
    </ClaudeCodeTerminal>
  );
}
