import { CodexExplored } from "../components/codex-explored";
import { CodexTerminal } from "../components/codex-terminal";
import { CODEX_DEMO_SESSION } from "../constants/codex-demo";

export default function CodexExploredExample() {
  return (
    <div className="w-full p-6">
      <CodexTerminal title={CODEX_DEMO_SESSION.title}>
        <CodexExplored
          details={CODEX_DEMO_SESSION.exploredDetails}
          items={CODEX_DEMO_SESSION.explored}
        />
        <CodexExplored active items={CODEX_DEMO_SESSION.exploredDetails} />
      </CodexTerminal>
    </div>
  );
}
