import { CodexComposer } from "../components/codex-composer";
import { CodexTerminal } from "../components/codex-terminal";
import { CODEX_DEMO_SESSION } from "../constants/codex-demo";

export default function CodexComposerExample() {
  return (
    <div className="p-6">
      <CodexTerminal title="codex — composer">
        <CodexComposer
          context={CODEX_DEMO_SESSION.context}
          placeholder={CODEX_DEMO_SESSION.promptPlaceholder}
        />
      </CodexTerminal>
    </div>
  );
}
