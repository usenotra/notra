import { ClaudeSearch } from "../components/claude-search";
import {
  CLAUDE_TOOL_CALLS_ANSWER,
  CLAUDE_TOOL_CALLS_INTRO,
  CLAUDE_TOOL_CALLS_ITEMS,
} from "../constants/claude-tool-calls";

export default function ClaudeToolCallsExample() {
  return (
    <div className="bg-claude-bg font-claude flex w-[calc(100vw-3rem)] max-w-full min-w-0 flex-col gap-4 p-6">
      <p className="font-claude-serif text-claude-fg text-base leading-[1.65]">
        {CLAUDE_TOOL_CALLS_INTRO}
      </p>
      <ClaudeSearch defaultOpen items={CLAUDE_TOOL_CALLS_ITEMS} />
      <p className="font-claude-serif text-claude-fg text-base leading-[1.65]">
        {CLAUDE_TOOL_CALLS_ANSWER}
      </p>
    </div>
  );
}
