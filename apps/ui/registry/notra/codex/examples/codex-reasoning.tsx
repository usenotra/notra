import { CodexReasoning } from "../components/codex-reasoning";
import { CodexTerminal } from "../components/codex-terminal";
import { CODEX_DEMO_SESSION } from "../constants/codex-demo";

export default function CodexReasoningExample() {
  return (
    <div className="w-full p-6">
      <CodexTerminal title={CODEX_DEMO_SESSION.title}>
        <CodexReasoning>{CODEX_DEMO_SESSION.reasoning}</CodexReasoning>
      </CodexTerminal>
    </div>
  );
}
