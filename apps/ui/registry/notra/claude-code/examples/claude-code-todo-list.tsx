import { ClaudeCodeTerminal } from "../components/claude-code-terminal";
import { ClaudeCodeTodoList } from "../components/claude-code-todo-list";
import { CLAUDE_CODE_TODO_STATES } from "../constants/claude-code-session";

export default function ClaudeCodeTodoListExample() {
  return (
    <ClaudeCodeTerminal title="claude — todos">
      <ClaudeCodeTodoList todos={CLAUDE_CODE_TODO_STATES} />
    </ClaudeCodeTerminal>
  );
}
