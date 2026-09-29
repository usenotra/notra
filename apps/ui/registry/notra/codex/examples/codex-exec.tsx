import { ItemGroup } from "@/components/ui/item";

import { CodexExec } from "../components/codex-exec";
import { CodexTerminal } from "../components/codex-terminal";
import { CODEX_DEMO_EXEC_STATES } from "../constants/codex-demo";

export default function CodexExecExample() {
  return (
    <div className="p-6">
      <CodexTerminal title="codex — exec">
        <ItemGroup className="gap-[1.0625rem]">
          {CODEX_DEMO_EXEC_STATES.map((exec) => (
            <CodexExec
              command={exec.command}
              defaultOpen={exec.status === "failed"}
              key={exec.id}
              role="listitem"
              output={exec.output}
              status={exec.status}
            />
          ))}
        </ItemGroup>
      </CodexTerminal>
    </div>
  );
}
