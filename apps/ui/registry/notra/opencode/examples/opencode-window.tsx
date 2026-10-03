import { OpencodeMessage } from "../components/opencode-message";
import { OpencodeWindow } from "../components/opencode-window";

export default function OpencodeWindowExample() {
  return (
    <div className="w-full p-6">
      <OpencodeWindow className="px-[2ch] py-[1lh]">
        <OpencodeMessage>Any OpenCode content goes here.</OpencodeMessage>
      </OpencodeWindow>
    </div>
  );
}
