import { CodexHeader } from "../components/codex-header";
import { CodexTerminal } from "../components/codex-terminal";
import { CODEX_DEMO_SESSION } from "../constants/codex-demo";

export default function CodexHeaderExample() {
  return (
    <div className="p-6">
      <CodexTerminal title="codex — header">
        <CodexHeader {...CODEX_DEMO_SESSION.header} />
      </CodexTerminal>
    </div>
  );
}
