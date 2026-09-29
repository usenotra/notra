import { OpencodeComposer } from "../components/opencode-composer";
import { OpencodeWindow } from "../components/opencode-window";
import { OPENCODE_DEMO_SESSION } from "../constants/opencode-demo";

export default function OpencodeComposerExample() {
  return (
    <div className="p-6">
      <OpencodeWindow className="p-5 sm:p-6">
        <OpencodeComposer context={OPENCODE_DEMO_SESSION.context} />
      </OpencodeWindow>
    </div>
  );
}
