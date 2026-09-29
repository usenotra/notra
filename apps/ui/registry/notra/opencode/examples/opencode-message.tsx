import { OpencodeMessage } from "../components/opencode-message";
import { OpencodeSources } from "../components/opencode-sources";
import { OpencodeWindow } from "../components/opencode-window";
import {
  OPENCODE_DEMO_SESSION,
  OPENCODE_DEMO_SOURCES,
} from "../constants/opencode-demo";

export default function OpencodeMessageExample() {
  return (
    <div className="p-6">
      <OpencodeWindow className="space-y-[1.0625rem] p-5 sm:p-6">
        <OpencodeMessage from="user">
          {OPENCODE_DEMO_SESSION.userMessage}
        </OpencodeMessage>
        <OpencodeMessage
          search={
            <OpencodeSources sources={OPENCODE_DEMO_SOURCES.slice(0, 3)} />
          }
        >
          {OPENCODE_DEMO_SESSION.assistantMessage}
        </OpencodeMessage>
      </OpencodeWindow>
    </div>
  );
}
