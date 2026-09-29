import { ClaudeSearch } from "../components/claude-search";
import { CLAUDE_DEMO_SEARCH } from "../constants/claude-demo";

export default function ClaudeSearchExample() {
  return (
    <div className="bg-claude-bg w-full p-6">
      <ClaudeSearch
        className="max-w-xl"
        groups={CLAUDE_DEMO_SEARCH.groups}
        steps={CLAUDE_DEMO_SEARCH.steps}
        summary={CLAUDE_DEMO_SEARCH.summary}
        thought={CLAUDE_DEMO_SEARCH.thought}
        verb={CLAUDE_DEMO_SEARCH.verb}
      />
    </div>
  );
}
