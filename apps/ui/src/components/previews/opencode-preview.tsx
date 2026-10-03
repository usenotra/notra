import { OpencodeMessage } from "../../../registry/notra/opencode/components/opencode-message";
import { OpencodeWindow } from "../../../registry/notra/opencode/components/opencode-window";

export default function OpencodePreview() {
  return (
    <div className="w-[26rem] origin-top scale-[0.8]">
      <OpencodeWindow className="gap-[1lh] px-[2ch] py-[1lh]">
        <OpencodeMessage from="user">
          which changelog tools do AI assistants recommend?
        </OpencodeMessage>
        <OpencodeMessage>
          <p>
            <strong>Notra</strong> comes up most, next to hand-written{" "}
            <code>CHANGELOG.md</code> files and GitHub releases.
          </p>
        </OpencodeMessage>
      </OpencodeWindow>
    </div>
  );
}
