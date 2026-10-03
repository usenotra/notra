import { ClaudeMessage } from "../components/claude-message";
import { ClaudeSources } from "../components/claude-sources";

export default function ClaudeMessageExample() {
  return (
    <div className="bg-claude-bg flex w-[calc(100vw-3rem)] max-w-full flex-col gap-8 p-6">
      <ClaudeMessage from="user">what's in the news today</ClaudeMessage>
      <ClaudeMessage
        from="assistant"
        sources={
          <ClaudeSources
            sources={[
              {
                domain: "reuters.com",
                href: "https://www.reuters.com/world/",
                title: "Reuters: World news for Tuesday, September 29",
              },
            ]}
          />
        }
      >
        European markets open higher after strong US tech earnings, while the
        debate over AI Act enforcement heats up.
      </ClaudeMessage>
    </div>
  );
}
