import { CodexTerminal } from "../components/codex-terminal";
import { CodexWorking } from "../components/codex-working";
import { CODEX_DEMO_SESSION } from "../constants/codex-demo";

export default function CodexWorkingExample() {
  return (
    <div className="w-full p-6">
      <CodexTerminal title={CODEX_DEMO_SESSION.title}>
        <CodexWorking elapsed="13s" />
      </CodexTerminal>
    </div>
  );
}
