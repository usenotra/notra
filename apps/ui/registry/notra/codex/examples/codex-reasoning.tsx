import { ItemGroup } from "@/components/ui/item";

import { CodexReasoning } from "../components/codex-reasoning";
import { CodexTerminal } from "../components/codex-terminal";
import { CODEX_DEMO_SESSION } from "../constants/codex-demo";

export default function CodexReasoningExample() {
  return (
    <div className="p-6">
      <CodexTerminal title="codex — reasoning">
        <ItemGroup className="gap-[1.0625rem]">
          <CodexReasoning role="listitem">
            {CODEX_DEMO_SESSION.reasoning}
          </CodexReasoning>
          <CodexReasoning defaultOpen role="listitem">
            {CODEX_DEMO_SESSION.reasoning}
          </CodexReasoning>
        </ItemGroup>
      </CodexTerminal>
    </div>
  );
}
