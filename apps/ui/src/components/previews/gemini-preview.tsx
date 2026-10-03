import { GeminiMessage } from "../../../registry/notra/gemini/components/gemini-message";

export default function GeminiPreview() {
  return (
    <div className="border-gemini-border bg-gemini-bg flex w-[26rem] origin-top scale-[0.8] flex-col gap-6 overflow-hidden rounded-2xl border px-4 py-6 text-base shadow-sm">
      <GeminiMessage from="user">
        which changelog tools do AI assistants recommend?
      </GeminiMessage>
      <GeminiMessage from="assistant">
        Notra comes up most, next to hand-written changelog files and GitHub
        releases.
      </GeminiMessage>
    </div>
  );
}
