import { ClaudeCodeHeader } from "../components/claude-code-header";
import { ClaudeCodeTerminal } from "../components/claude-code-terminal";
import { CLAUDE_CODE_SESSION } from "../constants/claude-code-session";

const { header } = CLAUDE_CODE_SESSION;

export default function ClaudeCodeHeaderExample() {
  return (
    <ClaudeCodeTerminal title="claude — header">
      <ClaudeCodeHeader {...header} variant="compact" />
      <ClaudeCodeHeader
        cwd=""
        tips={[]}
        user={header.user}
        version={header.version}
        whatsNew={header.whatsNew.slice(0, 1)}
      />
    </ClaudeCodeTerminal>
  );
}
