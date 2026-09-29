import { ItemGroup } from "@/components/ui/item";

import { CodexComposer } from "../components/codex-composer";
import { CodexExec } from "../components/codex-exec";
import { CodexHeader } from "../components/codex-header";
import { CodexMessage } from "../components/codex-message";
import { CodexReasoning } from "../components/codex-reasoning";
import { CodexTerminal } from "../components/codex-terminal";
import { CODEX_DEMO_SESSION } from "../constants/codex-demo";

export default function CodexDemo() {
  const session = CODEX_DEMO_SESSION;

  return (
    <div className="w-full min-w-0">
      <CodexTerminal className="h-150" title={session.title}>
        <CodexHeader {...session.header} />
        <CodexMessage from="user">{session.userMessage}</CodexMessage>
        {session.reasoning ? (
          <CodexReasoning>{session.reasoning}</CodexReasoning>
        ) : null}
        <CodexMessage>{session.assistantMessage}</CodexMessage>
        <ItemGroup className="gap-[1.0625rem]">
          {session.execs.map((exec) => (
            <CodexExec
              command={exec.command}
              key={exec.id}
              role="listitem"
              output={exec.output}
              status={exec.status}
            />
          ))}
        </ItemGroup>
        <CodexMessage>{session.resultMessage}</CodexMessage>
        <CodexComposer
          className="mt-1"
          context={session.context}
          placeholder={session.promptPlaceholder}
        />
      </CodexTerminal>
    </div>
  );
}
