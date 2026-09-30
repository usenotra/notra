import { CodexMessage } from "../components/codex-message";
import { CodexTerminal } from "../components/codex-terminal";

export default function CodexTerminalExample() {
  return (
    <div className="w-full p-6">
      <CodexTerminal title="codex — ~/acme/web">
        <CodexMessage>Any Codex content goes here.</CodexMessage>
      </CodexTerminal>
    </div>
  );
}
