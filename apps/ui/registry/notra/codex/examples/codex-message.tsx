import { CodexMessage } from "../components/codex-message";
import { CodexTerminal } from "../components/codex-terminal";
import { CODEX_DEMO_SESSION } from "../constants/codex-demo";

export default function CodexMessageExample() {
  return (
    <div className="w-full p-6">
      <CodexTerminal title={CODEX_DEMO_SESSION.title}>
        <CodexMessage from="user">
          {CODEX_DEMO_SESSION.userMessage}
        </CodexMessage>
        <CodexMessage>{CODEX_DEMO_SESSION.intro}</CodexMessage>
      </CodexTerminal>
    </div>
  );
}
