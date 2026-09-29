import { CodexMessage } from "../components/codex-message";
import { CodexTerminal } from "../components/codex-terminal";
import { CODEX_DEMO_SESSION } from "../constants/codex-demo";

export default function CodexMessageExample() {
  return (
    <div className="p-6">
      <CodexTerminal title="codex — messages">
        <CodexMessage from="user">
          {CODEX_DEMO_SESSION.userMessage}
        </CodexMessage>
        <CodexMessage>{CODEX_DEMO_SESSION.assistantMessage}</CodexMessage>
        <CodexMessage>{CODEX_DEMO_SESSION.resultMessage}</CodexMessage>
      </CodexTerminal>
    </div>
  );
}
