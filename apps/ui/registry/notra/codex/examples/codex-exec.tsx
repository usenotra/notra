import { CodexExec } from "../components/codex-exec";
import { CodexTerminal } from "../components/codex-terminal";
import {
  CODEX_DEMO_EXEC_STATES,
  CODEX_DEMO_SESSION,
} from "../constants/codex-demo";

export default function CodexExecExample() {
  return (
    <div className="w-full p-6">
      <CodexTerminal title={CODEX_DEMO_SESSION.title}>
        {CODEX_DEMO_EXEC_STATES.map((exec) => (
          <CodexExec
            command={exec.command}
            key={exec.id}
            output={exec.output}
            status={exec.status}
          />
        ))}
      </CodexTerminal>
    </div>
  );
}
