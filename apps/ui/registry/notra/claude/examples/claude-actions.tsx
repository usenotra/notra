import { ClaudeActions } from "../components/claude-actions";

export default function ClaudeActionsExample() {
  return (
    <div className="bg-claude-bg flex flex-col gap-6 p-6">
      <ClaudeActions text="European markets open higher." />
      <ClaudeActions
        className="self-end"
        from="user"
        text="what's in the news today"
        timestamp="now"
      />
    </div>
  );
}
