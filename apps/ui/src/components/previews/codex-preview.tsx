import { CodexMessage } from "../../../registry/notra/codex/components/codex-message";
import { CodexTerminal } from "../../../registry/notra/codex/components/codex-terminal";
import { CODEX_DEMO_SESSION } from "../../../registry/notra/codex/constants/codex-demo";

export default function CodexPreview() {
  return (
    <div className="w-[26rem] origin-top scale-[0.8]">
      <CodexTerminal title={CODEX_DEMO_SESSION.title}>
        <CodexMessage from="user">
          {CODEX_DEMO_SESSION.userMessage}
        </CodexMessage>
        <CodexMessage>{CODEX_DEMO_SESSION.intro}</CodexMessage>
      </CodexTerminal>
    </div>
  );
}
