import { ClaudeSourceLink } from "../components/claude-source-link";
import { ClaudeSources } from "../components/claude-sources";
import { CLAUDE_DEMO_SOURCES } from "../constants/claude-demo";

export default function ClaudeSourcesExample() {
  return (
    <div className="bg-claude-bg font-claude-serif text-claude-fg w-[calc(100vw-3rem)] max-w-full space-y-4 p-6 text-base leading-[1.65]">
      <ClaudeSources sources={CLAUDE_DEMO_SOURCES} />
      <p>
        Markets opened higher, according to{" "}
        <ClaudeSourceLink source={CLAUDE_DEMO_SOURCES[0]}>
          Reuters
        </ClaudeSourceLink>
        .
      </p>
    </div>
  );
}
