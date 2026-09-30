import { OpencodeMessage } from "../components/opencode-message";
import { OpencodeWindow } from "../components/opencode-window";

export default function OpencodeWindowExample() {
  return (
    <div className="p-6">
      <OpencodeWindow className="p-5 sm:p-6">
        <OpencodeMessage>Any OpenCode content goes here.</OpencodeMessage>
      </OpencodeWindow>
    </div>
  );
}
