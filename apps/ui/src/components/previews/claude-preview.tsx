import { ClaudeMessage } from "../../../registry/notra/claude/components/claude-message";

export default function ClaudePreview() {
  return (
    <div className="border-border bg-claude-bg flex w-[26rem] origin-top scale-[0.8] flex-col gap-6 overflow-hidden rounded-2xl border p-6 shadow-sm">
      <ClaudeMessage from="user">what's in the news today</ClaudeMessage>
      <ClaudeMessage from="assistant">
        European markets open higher after strong US tech earnings, while the
        debate over AI Act enforcement heats up.
      </ClaudeMessage>
    </div>
  );
}
